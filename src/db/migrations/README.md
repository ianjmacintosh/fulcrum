# Database Migrations

This directory contains database migration scripts for the Fulcrum application. The migration system is designed to safely update existing databases across all environments to support the new event recording architecture.

## Overview

The migration system transforms the database from the old event-status coupled architecture to the new architecture that separates events from status tracking and uses date-based status progression.

## Migration Architecture

### Key Changes

1. **Event Schema Migration** (`001-migrate-events-schema.ts`)
   - Converts events from `{eventType, statusId, statusName, notes}` to `{title, description}`
   - Removes coupling between events and status changes
   - Preserves all event data and dates

2. **Status Date Addition** (`002-add-status-dates.ts`)
   - Analyzes existing events to derive status progression dates
   - Adds fields: `appliedDate`, `phoneScreenDate`, `round1Date`, `round2Date`, `acceptedDate`, `declinedDate`
   - Uses intelligent mapping based on event titles and dates

3. **Application Status Workflow** (`003-update-application-statuses.ts`)
   - Creates new 7-status workflow for all users: Not Applied → Applied → Phone Screen → Round 1 → Round 2 → Accepted/Declined
   - Updates status references to use valid database IDs
   - Preserves existing status relationships where possible

### Safety Features

- **Dry-run mode** for testing migrations without making changes
- **Atomic operations** where possible to prevent partial updates
- **Detailed logging** and progress tracking
- **Rollback capability** for most migrations
- **Data validation** to verify migration success
- **Connection management** with proper cleanup

## Usage

### Available Commands

```bash
# Test migrations without making changes
npm run db:migrate dry-run

# Run all pending migrations
npm run db:migrate run

# Validate current data structure
npm run db:migrate validate

# Rollback a specific migration (use with caution)
npm run db:migrate rollback <migration-id>

# Show usage help
npm run db:migrate
```

### Pre-Migration Checklist

Before running migrations in any environment:

1. **Create a backup** of the current database
2. **Test in development first** using `dry-run`
3. **Verify application functionality** after dry-run
4. **Schedule maintenance window** for production
5. **Prepare rollback plan** if needed

### Environment Rollout Strategy

#### Development Environment
```bash
# 1. Backup current data (if needed)
mongodump --uri $MONGODB_URI --out backup_$(date +%Y%m%d_%H%M%S)

# 2. Test migrations
npm run db:migrate dry-run

# 3. Run migrations
npm run db:migrate run

# 4. Validate results
npm run db:migrate validate

# 5. Test application functionality
npm run dev
```

#### Staging/Production Environments
```bash
# 1. Create backup
railway run mongodump --uri $MONGO_URL --out backup_$(date +%Y%m%d_%H%M%S)

# 2. Run migrations
railway run npm run db:migrate run

# 3. Deploy new application code
railway deploy

# 4. Validate functionality
railway run npm run db:migrate validate
```

## Migration Details

### Data Transformation Logic

#### Event Title Mapping
The migration analyzes event titles and maps them to status dates:

- **Applied**: `eventTitle.includes('applied' | 'application')` → `appliedDate`
- **Phone Screen**: `eventTitle.includes('phone screen' | 'screening')` → `phoneScreenDate`
- **Round 1**: `eventTitle.includes('interview' | 'round 1' | 'technical')` → `round1Date`
- **Round 2**: `eventTitle.includes('round 2' | 'final round' | 'onsite')` → `round2Date`
- **Accepted**: `eventTitle.includes('accepted' | 'offer' | 'hired')` → `acceptedDate`
- **Declined**: `eventTitle.includes('rejected' | 'declined' | 'not selected')` → `declinedDate`

#### Special Cases
- If no explicit "applied" event exists, the earliest event date becomes `appliedDate`
- Status dates use the latest relevant event date (except for `appliedDate` which uses earliest)
- Existing status dates are preserved and not overwritten

### Rollback Considerations

⚠️ **Important**: Some migrations have limited rollback capability:

- **Event Schema**: Cannot recover original `statusId` values after migration
- **Status Dates**: Can be completely removed during rollback
- **Application Statuses**: May leave invalid status references

**Recommendation**: Only rollback in development environments. For production, prefer forward migration fixes.

### Validation

The migration system includes comprehensive validation:

- **Document count preservation**
- **Schema compliance checking**
- **Data integrity verification**
- **Sample data structure validation**

## Troubleshooting

### Common Issues

1. **Connection timeout**: Ensure database is accessible and credentials are correct
2. **Partial migration failure**: Check logs for specific error messages
3. **Validation failures**: Review data structure expectations vs reality

### Recovery Procedures

1. **From backup**: Restore database from pre-migration backup
2. **Manual fixes**: Use MongoDB shell to correct specific data issues
3. **Forward migration**: Create additional migrations to fix issues

## Database Backup and Restore

The application includes native JavaScript backup/restore scripts that work without external MongoDB tools.

### Backup Script (`scripts/backup-db.js`)

**Usage:**
```bash
npm run db:backup
```

**Environment Variables:**
- `MONGO_URL`: Connection string for the database to backup

**How it works:**
1. Connects to MongoDB using the `MONGO_URL` environment variable
2. Discovers all collections in the 'fulcrum' database
3. Exports each collection to a separate JSON file (e.g., `applications.json`, `users.json`)
4. Creates a `backup-metadata.json` file with backup information
5. Stores backup in `backups/backup_TIMESTAMP/` directory

**Output Structure:**
```
backups/backup_2025-08-21T17-36-31/
├── applications.json
├── users.json
├── application_statuses.json
├── workflows.json
├── job_boards.json
├── admin_users.json
└── backup-metadata.json
```

### Restore Script (`scripts/restore-db.js`)

**Usage:**
```bash
npm run db:restore <backup-directory-path>
```

**Example:**
```bash
npm run db:restore backups/backup_2025-08-21T17-36-31
```

**Environment Variables:**
- `MONGO_URL`: Connection string for the target database to restore to

**How it works:**
1. Validates backup directory and reads metadata
2. Connects to target database using `MONGO_URL`
3. For each collection in the backup:
   - **Drops the existing collection completely**
   - Creates new collection with data from backup JSON file
4. Restores all documents exactly as they were at backup time

**⚠️ Important Notes:**
- **Destructive operation**: Completely replaces existing data
- **All-or-nothing**: If it fails partway, some collections will be restored and others won't
- **Uses MONGO_URL**: Make sure this points to the correct database (staging, not production!)
- **Complete replacement**: Any changes since backup will be lost

### Backup Strategy for Deployments

**Before staging deployment:**
```bash
# Set MONGO_URL to staging connection string
export MONGO_URL="mongodb://staging-connection-string"
npm run db:backup
```

**Before production deployment:**
```bash
# Set MONGO_URL to production connection string  
export MONGO_URL="mongodb://production-connection-string"
npm run db:backup
```

**Emergency rollback:**
```bash
# Set MONGO_URL to target database
export MONGO_URL="mongodb://target-connection-string"
npm run db:restore backups/backup_TIMESTAMP
```

### Cross-Environment Operations

To backup from one environment and restore to another:

```bash
# 1. Backup from production
export MONGO_URL="mongodb://production-connection-string"
npm run db:backup

# 2. Restore to staging (using same backup)
export MONGO_URL="mongodb://staging-connection-string" 
npm run db:restore backups/backup_TIMESTAMP
```

### Support

## Adding New Migrations

To add a new migration:

1. Create a new file: `src/db/migrations/00X-description.ts`
2. Implement the `Migration` interface
3. Add the migration to `src/db/migrations/index.ts`
4. Test with dry-run before committing

See existing migrations for implementation examples.