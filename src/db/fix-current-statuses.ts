#!/usr/bin/env tsx

/**
 * Fix Current Status Script
 * 
 * This script recalculates the currentStatus field for all applications
 * based on their status dates. Run this after implementing the status
 * calculation logic to fix existing data.
 * 
 * Usage:
 *   npm run fix-statuses
 *   # or
 *   npx tsx src/db/fix-current-statuses.ts
 */

import { applicationService } from './services/applications'
import { closeDatabaseConnection } from './connection'

async function fixCurrentStatuses() {
  console.log('🔄 Starting current status fix...')
  console.log('')
  
  try {
    const startTime = Date.now()
    
    console.log('📊 Analyzing applications and recalculating current status...')
    const updatedCount = await applicationService.recalculateAllCurrentStatuses()
    
    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)
    
    console.log('')
    console.log('✅ Current status fix completed!')
    console.log(`📈 Updated ${updatedCount} applications`)
    console.log(`⏱️  Completed in ${duration} seconds`)
    
    if (updatedCount === 0) {
      console.log('')
      console.log('ℹ️  All applications already had correct current status')
      console.log('   No changes were needed.')
    } else {
      console.log('')
      console.log('🎯 Applications now show correct status based on their status dates:')
      console.log('   - Phone Screen applications show "Phone Screen" status')
      console.log('   - Round 1 applications show "Round 1" status')
      console.log('   - etc.')
    }
    
  } catch (error) {
    console.error('')
    console.error('❌ Error fixing current statuses:', error)
    process.exit(1)
  } finally {
    await closeDatabaseConnection()
  }
}

// Run the fix if this script is executed directly
if (process.argv[1] && process.argv[1].endsWith('/fix-current-statuses.ts')) {
  fixCurrentStatuses().catch(console.error)
}

export { fixCurrentStatuses }