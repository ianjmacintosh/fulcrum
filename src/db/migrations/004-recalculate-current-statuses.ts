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
export const recalculateCurrentStatuses: Migration = {
  id: '004',
  name: 'Recalculate Current Statuses',
  description: 'Recalculate currentStatus field based on status dates for all applications',
  
  async execute(db: import('mongodb').Db, dryRun: boolean): Promise<import('./migration-runner').MigrationResult> {
    console.log('🔄 Recalculating current status for all applications...')
    
    try {
      if (!dryRun) {
        const updatedCount = await applicationService.recalculateAllCurrentStatuses()
        
        console.log(`✅ Successfully updated currentStatus for ${updatedCount} applications`)
        
        if (updatedCount === 0) {
          console.log('ℹ️  No applications needed status updates (all were already correct)')
        }
        
        return {
          success: true,
          message: `Recalculated currentStatus for ${updatedCount} applications`,
          documentsModified: updatedCount,
          errors: []
        }
      } else {
        console.log('[DRY RUN] Would recalculate current statuses for all applications')
        return {
          success: true,
          message: 'Dry run completed',
          documentsModified: 0,
          errors: []
        }
      }
    } catch (error: any) {
      console.error('❌ Error recalculating current statuses:', error)
      return {
        success: false,
        message: `Failed to recalculate current statuses: ${error.message}`,
        documentsModified: 0,
        errors: [error.message]
      }
    }
  },

  async rollback() {
    return {
      success: false,
      message: 'Cannot rollback current status recalculation - this migration only fixes incorrect data',
      documentsModified: 0,
      errors: ['Rollback not supported for this migration']
    }
  }
}