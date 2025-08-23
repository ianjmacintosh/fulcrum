# Database Backup and Restore Guide

Quick reference for database backup and restore operations.

## Available Scripts

```bash
npm run db:backup    # Create backup using MONGO_URL
npm run db:restore   # Restore from backup using MONGO_URL
```

## Quick Start

### Create a backup

```bash
# Set source database
export MONGO_URL="mongodb://your-connection-string"
npm run db:backup
```

### Restore from backup

```bash
# Set target database
export MONGO_URL="mongodb://your-connection-string"
npm run db:restore backups/backup_2025-08-21T17-36-31
```

## Cross-Environment Operations

### Backup from production, restore to staging

```bash
# 1. Backup from production
export MONGO_URL="mongodb://production-connection-string"
npm run db:backup

# 2. Restore to staging
export MONGO_URL="mongodb://staging-connection-string"
npm run db:restore backups/backup_TIMESTAMP
```

## ⚠️ Important Safety Notes

- **Both scripts use `MONGO_URL`**: Change this variable to target different environments
- **Restore is destructive**: Completely replaces existing data
- **Always backup before migrations**: Create safety net for rollbacks
- **Verify MONGO_URL**: Double-check you're targeting the correct database!

## Full Documentation

See [src/db/migrations/README.md](src/db/migrations/README.md#database-backup-and-restore) for complete documentation, examples, and deployment strategies.
