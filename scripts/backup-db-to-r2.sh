#!/bin/bash
# PostgreSQL full dump → gzip → Cloudflare R2 (private bucket).
# Credentials: /root/.backup-r2.env (see scripts/backup-r2.env.example)
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/show-me-the-plan}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
LOCAL_BACKUP_DIR="${LOCAL_BACKUP_DIR:-/root/backups}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-7}"
CREDENTIALS="${CREDENTIALS:-/root/.backup-r2.env}"
LOG_FILE="${LOG_FILE:-/var/log/show-me-the-plan-db-backup.log}"

if [[ ! -f "$CREDENTIALS" ]]; then
  echo "Missing credentials file: $CREDENTIALS" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$CREDENTIALS"
set +a

: "${BACKUP_R2_ACCESS_KEY_ID:?BACKUP_R2_ACCESS_KEY_ID is required}"
: "${BACKUP_R2_SECRET_ACCESS_KEY:?BACKUP_R2_SECRET_ACCESS_KEY is required}"
: "${BACKUP_R2_BUCKET:?BACKUP_R2_BUCKET is required}"
: "${BACKUP_R2_ENDPOINT:?BACKUP_R2_ENDPOINT is required}"
: "${BACKUP_R2_PREFIX:?BACKUP_R2_PREFIX is required}"

DATABASE_USERNAME="${DATABASE_USERNAME:-strapi}"
DATABASE_NAME="${DATABASE_NAME:-strapi}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BASENAME="strapi-${TIMESTAMP}.sql.gz"
LOCAL_FILE="${LOCAL_BACKUP_DIR}/${BASENAME}"
S3_KEY="${BACKUP_R2_PREFIX%/}/${BASENAME}"

mkdir -p "$LOCAL_BACKUP_DIR"
touch "$LOG_FILE"

exec >>"$LOG_FILE" 2>&1
echo "=== backup started at $(date -Is) ==="

cd "$APP_DIR"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $APP_DIR/$COMPOSE_FILE" >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DATABASE_USERNAME" "$DATABASE_NAME" \
  | gzip > "$LOCAL_FILE"

echo "local dump: $LOCAL_FILE ($(du -h "$LOCAL_FILE" | cut -f1))"

export AWS_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION=auto

aws s3 cp "$LOCAL_FILE" "s3://${BACKUP_R2_BUCKET}/${S3_KEY}" \
  --endpoint-url "$BACKUP_R2_ENDPOINT"

echo "uploaded: s3://${BACKUP_R2_BUCKET}/${S3_KEY}"

find "$LOCAL_BACKUP_DIR" -name 'strapi-*.sql.gz' -mtime +"${LOCAL_RETENTION_DAYS}" -delete

echo "=== backup finished at $(date -Is) ==="
