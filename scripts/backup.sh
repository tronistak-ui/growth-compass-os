#!/bin/bash
# Dumps Postgres (and any uploaded files under STORAGE_LOCAL_ROOT) and
# pushes both to an S3-compatible bucket, off the VM. Works unchanged
# against real AWS S3 or OCI Object Storage's S3-compatible API (or any
# other S3-compatible provider) — only the endpoint/credentials differ, not
# this script. See DEPLOY.md "Backups" for how to set those up per client.
#
# Required env vars (set in .env, alongside the app's own variables):
#   DATABASE_URL       - same value the app uses
#   BACKUP_S3_BUCKET    - target bucket name
# Optional:
#   BACKUP_S3_ENDPOINT  - S3-compatible endpoint URL (omit for real AWS S3;
#                         required for OCI Object Storage — see DEPLOY.md)
#   BACKUP_S3_REGION    - passed to the AWS CLI for request signing
#   STORAGE_LOCAL_ROOT  - same value the app uses; skipped if unset/missing
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is not set}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is not set}"

DATE=$(date -u +%F)
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

AWS_ARGS=()
if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
  AWS_ARGS+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
fi
if [ -n "${BACKUP_S3_REGION:-}" ]; then
  AWS_ARGS+=(--region "$BACKUP_S3_REGION")
fi

echo "[backup] dumping database..."
pg_dump "$DATABASE_URL" | gzip > "$WORKDIR/db-$DATE.sql.gz"
aws s3 cp "$WORKDIR/db-$DATE.sql.gz" "s3://$BACKUP_S3_BUCKET/db-$DATE.sql.gz" "${AWS_ARGS[@]}"

if [ -n "${STORAGE_LOCAL_ROOT:-}" ] && [ -d "$STORAGE_LOCAL_ROOT" ]; then
  echo "[backup] archiving uploaded files..."
  tar czf "$WORKDIR/files-$DATE.tar.gz" -C "$(dirname "$STORAGE_LOCAL_ROOT")" "$(basename "$STORAGE_LOCAL_ROOT")"
  aws s3 cp "$WORKDIR/files-$DATE.tar.gz" "s3://$BACKUP_S3_BUCKET/files-$DATE.tar.gz" "${AWS_ARGS[@]}"
fi

echo "[backup] done — $DATE uploaded to s3://$BACKUP_S3_BUCKET/"
