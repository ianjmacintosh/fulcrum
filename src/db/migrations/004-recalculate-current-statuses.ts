import { Migration } from './migration-runner'
import { applicationService } from '../services/applications'

/**
 * Migration: Recalculate Current Status for All Applications
 * 
 * Problem: The currentStatus field was not being updated when status dates were changed,
 * causing job application cards to show incorrect status (e.g. "Applied" when phoneScreenDate exists).
 * 
 * Solution: Recalculate currentStatus based on status dates for all existing applications.
 */
export const migration: Migration = {
  id: '004-recalculate-current-statuses',
  description: 'Recalculate currentStatus field based on status dates for all applications',
  
  async up() {
    console.log('🔄 Recalculating current status for all applications...')
    
    try {
      const updatedCount = await applicationService.recalculateAllCurrentStatuses()
      
      console.log(`✅ Successfully updated currentStatus for ${updatedCount} applications`)
      
      if (updatedCount === 0) {
        console.log('ℹ️  No applications needed status updates (all were already correct)')
      }
      
      return true
    } catch (error) {
      console.error('❌ Error recalculating current statuses:', error)
      throw error
    }
  },

  async down() {
    console.log('⚠️  Cannot rollback current status recalculation')
    console.log('ℹ️  This migration only fixes incorrect data - no rollback needed')
    return true
  }
}