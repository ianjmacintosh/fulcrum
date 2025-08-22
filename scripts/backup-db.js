#!/usr/bin/env node

/**
 * Database backup script for all environments
 * Uses MONGO_URL environment variable for database connection
 */

import { MongoClient } from 'mongodb';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = `backup_${timestamp}`;
  const fullBackupPath = path.join(__dirname, '..', 'backups', backupDir);

  // Check if database URL is set
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error('❌ MONGO_URL environment variable not set');
    console.log('   Please set MONGO_URL to your database connection string');
    process.exit(1);
  }

  // Create backups directory if it doesn't exist
  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  console.log(`🔄 Creating database backup...`);
  console.log(`   Backup location: ${fullBackupPath}`);
  
  fs.mkdirSync(fullBackupPath, { recursive: true });

  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(mongoUrl);
    await client.connect();
    
    const db = client.db('fulcrum');
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`   Found ${collections.length} collections`);

    // Backup each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`   📁 Backing up collection: ${collectionName}`);
      
      const coll = db.collection(collectionName);
      const documents = await coll.find({}).toArray();
      
      const backupFile = path.join(fullBackupPath, `${collectionName}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(documents, null, 2));
      
      console.log(`      ✅ ${documents.length} documents saved`);
    }

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      database: 'fulcrum',
      collections: collections.map(c => c.name),
      totalCollections: collections.length,
      mongoUrl: mongoUrl.replace(/:([^:@]+)@/, ':***@') // Hide password
    };
    
    fs.writeFileSync(
      path.join(fullBackupPath, 'backup-metadata.json'), 
      JSON.stringify(metadata, null, 2)
    );

    console.log(`✅ Backup completed successfully!`);
    console.log(`   Backup stored at: ${fullBackupPath}`);
    console.log(`\n📋 To restore from this backup:`);
    console.log(`   Use MongoDB Compass or manually import each JSON file`);

    return fullBackupPath;
  } catch (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

createBackup();