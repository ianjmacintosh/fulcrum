import { connectToDatabase, closeDatabaseConnection } from './connection'
import { seedDatabase } from './seed'

/**
 * Re-seed Database Strategy
 * 
 * This script safely re-seeds the database while preserving user credentials.
 * It clears all application data but keeps admin and user accounts intact.
 */

async function preserveUsers() {
  console.log('💾 Backing up user credentials...')
  
  const db = await connectToDatabase()
  
  // Get all users and admins
  const users = await db.collection('users').find({}).toArray()
  const admins = await db.collection('admins').find({}).toArray()
  
  console.log(`   Found ${users.length} users and ${admins.length} admins to preserve`)
  
  return { users, admins }
}

async function clearApplicationData() {
  console.log('🧹 Clearing application data...')
  
  const db = await connectToDatabase()
  
  // Clear all application-related collections but preserve users
  const collections = [
    'applications',
    'application_statuses', 
    'workflows',
    'job_boards',
    '_migrations'  // Also clear migration history
  ]
  
  let totalDeleted = 0
  
  for (const collectionName of collections) {
    const result = await db.collection(collectionName).deleteMany({})
    totalDeleted += result.deletedCount
    console.log(`   - Cleared ${collectionName}: ${result.deletedCount} documents`)
  }
  
  console.log(`✅ Total documents removed: ${totalDeleted}`)
}

async function restoreUsers(backup: { users: any[], admins: any[] }) {
  console.log('🔄 Restoring user credentials...')
  
  const db = await connectToDatabase()
  
  // Restore users (if any were deleted)
  if (backup.users.length > 0) {
    const existingUsers = await db.collection('users').countDocuments()
    if (existingUsers === 0) {
      await db.collection('users').insertMany(backup.users)
      console.log(`   ✅ Restored ${backup.users.length} users`)
    } else {
      console.log(`   ✅ Users already exist, skipping restore`)
    }
  }
  
  // Restore admins (if any were deleted)
  if (backup.admins.length > 0) {
    const existingAdmins = await db.collection('admins').countDocuments()
    if (existingAdmins === 0) {
      await db.collection('admins').insertMany(backup.admins)
      console.log(`   ✅ Restored ${backup.admins.length} admins`)
    } else {
      console.log(`   ✅ Admins already exist, skipping restore`)
    }
  }
}

async function reseedDatabase() {
  console.log('\n🌱 Starting database re-seeding...')
  console.log('=' .repeat(50))
  
  try {
    // Step 1: Backup user credentials
    const userBackup = await preserveUsers()
    
    // Step 2: Clear application data
    await clearApplicationData()
    
    // Step 3: Restore user credentials
    await restoreUsers(userBackup)
    
    // Step 4: Run the normal seed process with force flag
    console.log('\n📦 Running fresh seed process...')
    await seedDatabase(true)
    
    console.log('\n🎉 Database re-seeding completed successfully!')
    console.log('   ✅ User credentials preserved')
    console.log('   ✅ Fresh application data seeded')
    console.log('   ✅ New schema format applied')
    
  } catch (error: any) {
    console.error('❌ Re-seeding failed:', error.message)
    throw error
  } finally {
    await closeDatabaseConnection()
  }
}

// Environment-specific re-seeding commands
async function reseedEnvironment(environment?: string) {
  console.log(`\n🌍 Re-seeding ${environment || 'current'} environment...`)
  
  // Add environment-specific logic here if needed
  // For example, different connection strings or validation
  
  await reseedDatabase()
}

// Command line interface
const args = process.argv.slice(2)
const command = args[0]
const environment = args[1]

async function main() {
  try {
    switch (command) {
      case 'local':
        console.log('🏠 Re-seeding local development database...')
        await reseedDatabase()
        break
        
      case 'env':
        if (!environment) {
          console.error('Usage: npm run db:reseed env <environment>')
          process.exit(1)
        }
        await reseedEnvironment(environment)
        break
        
      case 'force':
        console.log('⚠️  FORCE re-seed - this will clear ALL data except users!')
        await reseedDatabase()
        break
        
      default:
        console.log('Database Re-seeding Tool')
        console.log('========================')
        console.log('')
        console.log('This tool safely re-seeds the database while preserving user credentials.')
        console.log('It clears all application data and creates fresh seed data with the new schema.')
        console.log('')
        console.log('Usage:')
        console.log('  npm run db:reseed local           - Re-seed local development database')
        console.log('  npm run db:reseed env <name>      - Re-seed specific environment')
        console.log('  npm run db:reseed force           - Force re-seed (dangerous)')
        console.log('')
        console.log('⚠️  WARNING: This will delete all application data!')
        console.log('   Users and admin accounts will be preserved.')
        break
    }
  } catch (error: any) {
    console.error('💥 Re-seeding failed:', error.message)
    process.exit(1)
  }
}

// Only run if called directly
if (process.argv[1]?.endsWith('/reseed.ts') || process.argv[1]?.endsWith('\\reseed.ts')) {
  main()
}

export { reseedDatabase, reseedEnvironment }