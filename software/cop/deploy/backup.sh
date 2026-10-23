#!/bin/sh
set -eu
umask 077
mkdir -p backups
name="backups/cop-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose --env-file .env -f deploy/compose.yaml exec -T db pg_dump -U cop -d cop -Fc > "$name"
test -s "$name"
echo "Backup complete: $name"
# Keep copies on a separate approved RF storage target. This script does not remove old backups.
