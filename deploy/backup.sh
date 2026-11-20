#!/usr/bin/env bash
# CoreMan — daily database backup (runs from cron at 03:30). Keeps the last 14 days.
# Restore one:  sudo -u postgres pg_restore --clean --if-exists -d coreman /var/backups/coreman/coreman-YYYY-MM-DD.dump
set -euo pipefail
DIR=/var/backups/coreman
mkdir -p "$DIR"
FILE="$DIR/coreman-$(date +%F).dump"
sudo -u postgres pg_dump -Fc coreman > "$FILE"
chmod 600 "$FILE"
find "$DIR" -name 'coreman-*.dump' -mtime +14 -delete
echo "$(date '+%F %T') backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
