#!/usr/bin/env bash
# CoreMan — one-time setup of a fresh Ubuntu 24.04 VPS (e.g. Hostinger KVM).
#
# Usage (as root, on the server):
#   curl -fsSL https://raw.githubusercontent.com/AladinSojon/coreman/main/deploy/setup-server.sh -o setup-server.sh
#   bash setup-server.sh yourdomain.com you@example.com
#
# Installs Java 21, Node 22, PostgreSQL, Nginx, free SSL (Let's Encrypt), a firewall, automatic security
# updates and daily database backups; builds the shop from GitHub and starts it. Safe to re-run.
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
REPO="${REPO:-https://github.com/AladinSojon/coreman.git}"
BRANCH="${BRANCH:-main}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage: bash setup-server.sh yourdomain.com you@example.com"; exit 1
fi
if [[ $EUID -ne 0 ]]; then echo "Run as root (or with sudo)."; exit 1; fi
DOMAIN="${DOMAIN#www.}"   # always use the bare domain; www is added below

APP_DIR=/opt/coreman
SRC_DIR=$APP_DIR/src
WEB_DIR=/var/www/coreman
ENV_FILE=/etc/coreman/coreman.env
BACKUP_DIR=/var/backups/coreman

step() { echo; echo "==> $*"; }

step "Updating the system and installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ufw nginx postgresql openjdk-21-jdk-headless certbot python3-certbot-nginx \
  unattended-upgrades fail2ban ca-certificates gnupg

if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  step "Installing Node.js 22 (needed to build the shop)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if [[ ! -f /swapfile && "$(free -m | awk '/Mem:/ {print $2}')" -lt 6000 ]]; then
  step "Adding 2 GB swap (helps builds on small servers)"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

step "Creating the app user and folders"
id coreman >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin coreman
mkdir -p "$APP_DIR" "$WEB_DIR" /etc/coreman "$BACKUP_DIR" /var/lib/coreman/uploads
chown -R coreman:coreman /var/lib/coreman

step "Setting up PostgreSQL"
if [[ ! -f "$ENV_FILE" ]]; then
  DB_PASS="$(openssl rand -hex 24)"
  JWT="$(openssl rand -hex 48)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'coreman') THEN
    CREATE ROLE coreman LOGIN PASSWORD '$DB_PASS';
  ELSE
    ALTER ROLE coreman WITH PASSWORD '$DB_PASS';
  END IF;
END \$\$;
SQL
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'coreman'" | grep -q 1 \
    || sudo -u postgres createdb -O coreman coreman

  step "Writing $ENV_FILE (secrets are generated here and never leave the server)"
  cat > "$ENV_FILE" <<ENV
# CoreMan backend settings — edit, then: systemctl restart coreman
DATABASE_URL=jdbc:postgresql://localhost:5432/coreman
DATABASE_USER=coreman
DATABASE_PASSWORD=$DB_PASS
JWT_SECRET=$JWT

# The shop and API share one address; Nginx forwards /api to the backend.
SERVER_ADDRESS=127.0.0.1
FRONTEND_URL=https://$DOMAIN
BACKEND_URL=https://$DOMAIN
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

# Photos uploaded in Admin (backed up nightly with the database)
UPLOAD_DIR=/var/lib/coreman/uploads

# Email for password reset links. Leave MAIL_HOST empty to turn email off
# (customers then ask you on WhatsApp and you make a link in Admin -> Customers).
# Gmail: MAIL_HOST=smtp.gmail.com, MAIL_USERNAME=you@gmail.com, MAIL_PASSWORD=<16-letter app password>
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=

# Online payments (SSLCommerz). Leave empty to offer Cash on Delivery only.
# Live: set your live Store ID/Password and SSLCOMMERZ_SANDBOX=false.
SSLCOMMERZ_STORE_ID=
SSLCOMMERZ_STORE_PASSWORD=
SSLCOMMERZ_SANDBOX=true
ENV
  chmod 600 "$ENV_FILE"
else
  echo "   $ENV_FILE already exists — keeping your settings."
fi

step "Getting the code from GitHub"
if [[ -d "$SRC_DIR/.git" ]]; then
  git -C "$SRC_DIR" fetch --quiet origin && git -C "$SRC_DIR" checkout --quiet "$BRANCH" && git -C "$SRC_DIR" pull --quiet --ff-only
else
  git clone --quiet --branch "$BRANCH" "$REPO" "$SRC_DIR"
fi

step "Installing the service, update and backup scripts"
install -m 644 "$SRC_DIR/deploy/coreman.service" /etc/systemd/system/coreman.service
install -m 755 "$SRC_DIR/deploy/update.sh" /usr/local/bin/coreman-update
install -m 755 "$SRC_DIR/deploy/backup.sh" /usr/local/bin/coreman-backup
systemctl daemon-reload
systemctl enable coreman >/dev/null
echo "30 3 * * * root /usr/local/bin/coreman-backup >> /var/log/coreman-backup.log 2>&1" > /etc/cron.d/coreman-backup

step "Configuring Nginx for $DOMAIN"
sed "s/__DOMAIN__/$DOMAIN/g" "$SRC_DIR/deploy/nginx.conf" > /etc/nginx/sites-available/coreman
ln -sf /etc/nginx/sites-available/coreman /etc/nginx/sites-enabled/coreman
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

step "Turning on the firewall (SSH, HTTP, HTTPS only)"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban >/dev/null
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null || true

step "Building and starting CoreMan (first build takes a few minutes)"
/usr/local/bin/coreman-update

step "Requesting the free SSL certificate"
if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --redirect --agree-tos -m "$EMAIL" -n; then
  echo "   HTTPS is on."
else
  echo
  echo "   !! SSL failed. Usually the domain's DNS doesn't point to this server yet."
  echo "   !! Check the A records for $DOMAIN and www.$DOMAIN, wait a while, then run:"
  echo "   !!   certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect --agree-tos -m $EMAIL -n"
fi

echo
echo "Done. Visit https://$DOMAIN"
echo "  Update after pushing to GitHub:  coreman-update"
echo "  Settings (payments etc.):        nano $ENV_FILE  then  systemctl restart coreman"
echo "  Logs:                            journalctl -u coreman -f"
