#!/usr/bin/env node

/**
 * Database backup script for production deployments
 * Uses MONGO_URL_PROD environment variable for production connection
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = `backup_${timestamp}`;
  const fullBackupPath = path.join(__dirname, '..', 'backups', backupDir);

  // Check if production URL is set
  const mongoUrl = process.env.MONGO_URL_PROD;
  if (!mongoUrl) {
    console.error('❌ MONGO_URL_PROD environment variable not set');
    console.log('   Please set MONGO_URL_PROD to your production database connection string');
    process.exit(1);
  }

  // Create backups directory if it doesn't exist
  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  console.log(`🔄 Creating database backup...`);
  console.log(`   Backup location: ${fullBackupPath}`);

  try {
    // Run mongodump
    execSync(`mongodump --uri "${mongoUrl}" --out "${fullBackupPath}"`, {
      stdio: 'inherit'
    });

    console.log(`✅ Backup completed successfully!`);
    console.log(`   Backup stored at: ${fullBackupPath}`);
    console.log(`\n📋 To restore from this backup:`);
    console.log(`   mongorestore --uri "YOUR_MONGO_URL" --drop "${fullBackupPath}"`);

    return fullBackupPath;
  } catch (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    process.exit(1);
  }
}

// Check if mongodump is available
try {
  execSync('mongodump --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ mongodump not found. Please install MongoDB tools:');
  console.log('   brew install mongodb/brew/mongodb-database-tools');
  console.log('   or visit: https://www.mongodb.com/try/download/database-tools');
  process.exit(1);
}

createBackup();