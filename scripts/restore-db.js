#!/usr/bin/env node

/**
 * Database restore script
 * Restores from JSON backup created by backup-db.js
 */

import { MongoClient } from 'mongodb';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function restoreBackup(backupPath) {
  // Check if backup directory exists
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup directory not found: ${backupPath}`);
    process.exit(1);
  }

  // Check for metadata file
  const metadataPath = path.join(backupPath, 'backup-metadata.json');
  if (!fs.existsSync(metadataPath)) {
    console.error(`❌ Backup metadata not found: ${metadataPath}`);
    process.exit(1);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  console.log(`🔄 Restoring backup from ${metadata.timestamp}...`);
  console.log(`   Source: ${backupPath}`);
  console.log(`   Collections: ${metadata.collections.join(', ')}`);

  // Get connection string (use MONGO_URL for restore target)
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error('❌ MONGO_URL environment variable not set');
    console.log('   Please set MONGO_URL to your target database connection string');
    process.exit(1);
  }

  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(mongoUrl);
    await client.connect();
    
    const db = client.db('fulcrum');
    
    // Restore each collection
    for (const collectionName of metadata.collections) {
      const backupFile = path.join(backupPath, `${collectionName}.json`);
      
      if (!fs.existsSync(backupFile)) {
        console.log(`   ⚠️  Skipping ${collectionName} - backup file not found`);
        continue;
      }

      console.log(`   📁 Restoring collection: ${collectionName}`);
      
      const documents = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      
      if (documents.length === 0) {
        console.log(`      ✅ Collection empty - no documents to restore`);
        continue;
      }

      const collection = db.collection(collectionName);
      
      // Drop existing collection and recreate
      try {
        await collection.drop();
        console.log(`      🗑️  Dropped existing collection`);
      } catch (error) {
        // Collection might not exist, which is fine
      }

      // Insert documents
      await collection.insertMany(documents);
      console.log(`      ✅ Restored ${documents.length} documents`);
    }

    console.log(`✅ Restore completed successfully!`);
    console.log(`   Database restored from backup: ${metadata.timestamp}`);

  } catch (error) {
    console.error(`❌ Restore failed: ${error.message}`);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Get backup path from command line argument
const backupPath = process.argv[2];

if (!backupPath) {
  console.error('❌ Please provide backup directory path');
  console.log('Usage: node scripts/restore-db.js <backup-directory-path>');
  console.log('Example: node scripts/restore-db.js backups/backup_2025-08-21T17-36-31');
  process.exit(1);
}

// Make path absolute if it's relative
const fullBackupPath = path.isAbsolute(backupPath) 
  ? backupPath 
  : path.join(__dirname, '..', backupPath);

restoreBackup(fullBackupPath);