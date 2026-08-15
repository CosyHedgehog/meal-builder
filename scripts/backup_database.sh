#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${DB_PATH:-$PROJECT_ROOT/meal_builder.sqlite3}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/database}"
RETENTION_COUNT="${RETENTION_COUNT:-14}"
SQLITE_BIN="${SQLITE_BIN:-sqlite3}"
LOCK_FILE="${LOCK_FILE:-$BACKUP_DIR/.backup.lock}"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

if ! [[ "$RETENTION_COUNT" =~ ^[1-9][0-9]*$ ]]; then
  log "ERROR: RETENTION_COUNT must be a positive integer"
  exit 1
fi

if [ ! -f "$DB_PATH" ]; then
  log "ERROR: SQLite database not found: $DB_PATH"
  exit 1
fi

if ! command -v "$SQLITE_BIN" >/dev/null 2>&1; then
  log "ERROR: sqlite3 is not installed or not on PATH"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Another database backup is already running; exiting"
  exit 0
fi

timestamp="$(date '+%Y%m%d-%H%M%S')"
backup_path="$BACKUP_DIR/meal_builder-$timestamp.sqlite3"
temporary_path="$backup_path.tmp"

cleanup() {
  rm -f "$temporary_path"
}
trap cleanup EXIT

log "Backing up $DB_PATH"
"$SQLITE_BIN" "$DB_PATH" ".backup '$temporary_path'"
mv -- "$temporary_path" "$backup_path"

if ! "$SQLITE_BIN" "$backup_path" 'PRAGMA integrity_check;' | grep -qx 'ok'; then
  log "ERROR: Backup integrity check failed: $backup_path"
  rm -f "$backup_path"
  exit 1
fi

mapfile -t backups < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'meal_builder-*.sqlite3' -printf '%T@ %p\n' | sort -rn | tail -n +$((RETENTION_COUNT + 1)) | cut -d' ' -f2-)
for old_backup in "${backups[@]}"; do
  rm -f -- "$old_backup"
  log "Removed old backup: $old_backup"
done

log "Backup complete: $backup_path"
