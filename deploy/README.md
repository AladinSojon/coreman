# Deploying CoreMan on a Hostinger VPS

Everything runs on one Ubuntu server at **one address**: the shop at `https://yourdomain.com`, and the
backend API behind it at `https://yourdomain.com/api` (Nginx forwards it). One server, one SSL certificate,
no cross-site (CORS) setup.

```
Browser ──https──> Nginx (:443) ──/api/*──> Spring Boot (127.0.0.1:8080) ──> PostgreSQL (localhost)
                       └── everything else ──> /var/www/coreman (the built React shop)
```

---

## 1. Buy the VPS (Hostinger hPanel)
1. **VPS → KVM 1** (1 vCPU / 4 GB RAM) is enough to start; **KVM 2** gives more room.
2. **Operating system: Ubuntu 24.04** (plain OS, no control panel).
3. Set a strong **root password** (or add your SSH key). Note the server's **IP address**.

## 2. Point your domain at the server (Hostinger → Domains → DNS / Nameservers)
Delete any existing `A` records for `@` and `www`, then add:

| Type | Name | Points to | TTL |
|---|---|---|---|
| A | `@`   | your VPS IP | 300 |
| A | `www` | your VPS IP | 300 |

DNS usually updates within minutes (up to a few hours). Check with: `nslookup yourdomain.com`.

## 3. Log in to the server
On Windows, open **PowerShell** (or Hostinger's browser terminal in hPanel):
```bash
ssh root@YOUR_VPS_IP
```

## 4. Run the setup (one command, ~10 minutes)
```bash
curl -fsSL https://raw.githubusercontent.com/AladinSojon/coreman/main/deploy/setup-server.sh -o setup-server.sh
bash setup-server.sh yourdomain.com you@example.com
```
The email is used by Let's Encrypt for SSL expiry notices. The script:
- installs Java 21, Node 22, PostgreSQL, Nginx, Certbot, firewall (SSH/HTTP/HTTPS only), fail2ban and automatic security updates;
- creates the database with a **random password** and a **random JWT secret** in `/etc/coreman/coreman.env` (they never leave the server);
- builds the shop from GitHub and starts it as a service that restarts on crashes and reboots;
- gets a free **HTTPS certificate** (renews automatically);
- schedules a **daily database backup** at 03:30 (kept 14 days in `/var/backups/coreman`).

When it finishes, open `https://yourdomain.com`.

> If the SSL step fails, DNS isn't pointing at the server yet. Wait, then run the `certbot` command it prints.

## 5. Secure the shop right away
On a **fresh database**, the shop creates two sample accounts:
`admin@coreman.com / admin123` and `demo@coreman.com / demo123`.
1. Register **your own** account on the site.
2. Make it an admin on the server:
   ```bash
   sudo -u postgres psql coreman -c "UPDATE users SET role='ADMIN' WHERE email='you@example.com';"
   ```
3. Remove the sample accounts' access:
   ```bash
   sudo -u postgres psql coreman -c "UPDATE users SET role='CUSTOMER', password_hash='disabled' WHERE email IN ('admin@coreman.com','demo@coreman.com');"
   ```
4. Delete the 6 sample products in **Admin → Products** (or set them Hidden) and add your own.

## 6. Moving your existing data from Supabase (optional)
Skip this if you're starting fresh. Otherwise, on the VPS:
```bash
systemctl stop coreman
# Connection string: Supabase → Project Settings → Database → Connection string (URI)
pg_dump "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres" \
  --schema=public --no-owner --no-acl -Fc -f /root/supabase.dump
sudo -u postgres dropdb coreman && sudo -u postgres createdb -O coreman coreman
sudo -u postgres pg_restore --no-owner --role=coreman -d coreman /root/supabase.dump
systemctl start coreman
```
If `pg_dump` says the server version is newer, install a matching client:
`apt install postgresql-client-17` (from the PostgreSQL apt repository) and run it again.

Product photos stay in Supabase Storage — nothing to move.

## 7. Online payments (SSLCommerz)
Edit the settings file, then restart:
```bash
nano /etc/coreman/coreman.env      # fill in SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD
systemctl restart coreman
```
- Test first with your **sandbox** keys (`SSLCOMMERZ_SANDBOX=true`).
- When SSLCommerz approves your live account: put in the **live** keys and set `SSLCOMMERZ_SANDBOX=false`.
- In the SSLCommerz merchant panel, set the **IPN URL** to `https://yourdomain.com/api/payments/sslcommerz/ipn`.

## Everyday commands

| Task | Command |
|---|---|
| Deploy the latest code from GitHub | `coreman-update` (rolls back automatically if the new version fails to start) |
| See live logs | `journalctl -u coreman -f` |
| Restart the backend | `systemctl restart coreman` |
| Change settings | `nano /etc/coreman/coreman.env` then `systemctl restart coreman` |
| Back up now | `coreman-backup` |
| Restore a backup | `systemctl stop coreman && sudo -u postgres pg_restore --clean --if-exists -d coreman /var/backups/coreman/coreman-YYYY-MM-DD.dump && systemctl start coreman` |
| Check SSL renewal | `certbot renew --dry-run` |

## Good practice
- **Off-server backups:** the daily backups live on the same server. Once a week, download one to your
  computer: `scp root@YOUR_VPS_IP:/var/backups/coreman/coreman-*.dump .` — or enable Hostinger's VPS
  snapshots/backups in hPanel.
- **SSH keys instead of a password** for root, once you're comfortable.
- After it's live, you can stop the old Railway / Vercel / Supabase services to avoid paying twice
  (keep Supabase Storage if your product photos are there).
