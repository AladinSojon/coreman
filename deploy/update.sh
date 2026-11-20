#!/usr/bin/env bash
# CoreMan — pull the latest code from GitHub, rebuild, and restart. Run on the server as root:
#   coreman-update
# If the new version fails its health check, the previous version is restored automatically.
set -euo pipefail

APP_DIR=/opt/coreman
SRC_DIR=$APP_DIR/src
WEB_DIR=/var/www/coreman
BRANCH="${BRANCH:-main}"

step() { echo; echo "==> $*"; }

step "Pulling latest code ($BRANCH)"
git -C "$SRC_DIR" fetch --quiet origin
git -C "$SRC_DIR" checkout --quiet "$BRANCH"
git -C "$SRC_DIR" pull --quiet --ff-only
echo "   now at $(git -C "$SRC_DIR" log -1 --format='%h %s')"

step "Building the backend"
cd "$SRC_DIR/backend"
chmod +x gradlew
./gradlew bootJar --no-daemon -q
JAR="$(ls build/libs/*.jar | grep -v -- '-plain.jar' | head -1)"

step "Building the shop"
cd "$SRC_DIR/frontend"
npm ci --no-audit --no-fund --loglevel=error
npx vite build --mode vps --logLevel warn

step "Installing the new version"
[[ -f "$APP_DIR/app.jar" ]] && cp "$APP_DIR/app.jar" "$APP_DIR/app.jar.previous"
cp "$JAR" "$APP_DIR/app.jar"
chown coreman:coreman "$APP_DIR/app.jar"
rm -rf "$WEB_DIR.previous"
[[ -d "$WEB_DIR" ]] && cp -a "$WEB_DIR" "$WEB_DIR.previous"
rm -rf "${WEB_DIR:?}"/*
cp -a dist/. "$WEB_DIR/"

step "Restarting"
systemctl restart coreman

# Wait up to 2 minutes for the API to answer.
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8080/api/products/filters >/dev/null 2>&1; then
    echo "   CoreMan is up."
    exit 0
  fi
  sleep 2
done

echo "!! The new version didn't start. Rolling back — see: journalctl -u coreman -n 100"
if [[ -f "$APP_DIR/app.jar.previous" ]]; then
  cp "$APP_DIR/app.jar.previous" "$APP_DIR/app.jar"
  [[ -d "$WEB_DIR.previous" ]] && { rm -rf "${WEB_DIR:?}"/*; cp -a "$WEB_DIR.previous/." "$WEB_DIR/"; }
  systemctl restart coreman
  echo "   Previous version restored."
fi
exit 1
