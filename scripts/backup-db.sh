#!/bin/bash
# =============================================================================
# TASK-111: Database Backup Script
# =============================================================================
# Creates a PostgreSQL backup and optionally uploads to S3
#
# Usage:
#   ./scripts/backup-db.sh                    # Local backup only
#   ./scripts/backup-db.sh --upload-s3        # Backup and upload to S3
#   ./scripts/backup-db.sh --restore <file>   # Restore from backup
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="cfkanban_backup_${DATE}.sql"
S3_BUCKET="${S3_BUCKET:-}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check for required environment variable
check_database_url() {
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "DATABASE_URL environment variable is not set"
        exit 1
    fi
}

# Create backup directory if it doesn't exist
ensure_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backup directory: $BACKUP_DIR"
    fi
}

# Create database backup
create_backup() {
    log_info "Creating backup: $BACKUP_FILE"

    # Create backup using pg_dump
    pg_dump "${DATABASE_URL}" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        > "${BACKUP_DIR}/${BACKUP_FILE}"

    # Compress the backup
    log_info "Compressing backup..."
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"

    local backup_size=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz" | cut -f1)
    log_info "Backup created: ${BACKUP_FILE}.gz (${backup_size})"
}

# Upload to S3
upload_to_s3() {
    if [[ -z "$S3_BUCKET" ]]; then
        log_warn "S3_BUCKET not set, skipping upload"
        return
    fi

    log_info "Uploading to S3: s3://${S3_BUCKET}/${BACKUP_FILE}.gz"

    aws s3 cp \
        "${BACKUP_DIR}/${BACKUP_FILE}.gz" \
        "s3://${S3_BUCKET}/${BACKUP_FILE}.gz" \
        --storage-class STANDARD_IA

    log_info "Upload complete"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning backups older than ${RETENTION_DAYS} days..."

    # Clean local backups
    find "$BACKUP_DIR" -name "cfkanban_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

    # Clean S3 backups if bucket is configured
    if [[ -n "$S3_BUCKET" ]]; then
        log_info "Cleaning old S3 backups..."
        # List and delete old backups
        aws s3 ls "s3://${S3_BUCKET}/" | while read -r line; do
            filename=$(echo "$line" | awk '{print $4}')
            if [[ "$filename" == cfkanban_backup_*.sql.gz ]]; then
                filedate=$(echo "$filename" | sed 's/cfkanban_backup_\([0-9]*\)_.*/\1/')
                if [[ $(date -d "$filedate" +%s 2>/dev/null || echo 0) -lt $(date -d "-${RETENTION_DAYS} days" +%s) ]]; then
                    aws s3 rm "s3://${S3_BUCKET}/${filename}"
                    log_info "Deleted old backup: $filename"
                fi
            fi
        done
    fi

    log_info "Cleanup complete"
}

# Restore from backup
restore_backup() {
    local backup_file="$1"

    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi

    log_warn "This will OVERWRITE the current database!"
    read -p "Are you sure you want to continue? (yes/no): " confirm

    if [[ "$confirm" != "yes" ]]; then
        log_info "Restore cancelled"
        exit 0
    fi

    log_info "Restoring from: $backup_file"

    # Decompress if gzipped
    if [[ "$backup_file" == *.gz ]]; then
        local temp_file="/tmp/restore_$(date +%s).sql"
        gunzip -c "$backup_file" > "$temp_file"
        backup_file="$temp_file"
    fi

    # Restore the database
    psql "${DATABASE_URL}" < "$backup_file"

    # Clean up temp file if created
    if [[ -n "${temp_file:-}" && -f "$temp_file" ]]; then
        rm "$temp_file"
    fi

    log_info "Restore complete"
}

# Main script
main() {
    check_database_url

    case "${1:-backup}" in
        --restore)
            if [[ -z "${2:-}" ]]; then
                log_error "Please specify backup file to restore"
                echo "Usage: $0 --restore <backup_file>"
                exit 1
            fi
            restore_backup "$2"
            ;;
        --upload-s3)
            ensure_backup_dir
            create_backup
            upload_to_s3
            cleanup_old_backups
            ;;
        --cleanup)
            cleanup_old_backups
            ;;
        backup|*)
            ensure_backup_dir
            create_backup
            cleanup_old_backups
            ;;
    esac
}

main "$@"
