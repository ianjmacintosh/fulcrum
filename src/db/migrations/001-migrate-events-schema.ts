import { Db } from 'mongodb'
import { Migration, MigrationResult } from './migration-runner'

/**
 * Migration 001: Migrate Events Schema
 * 
 * Transforms application events from the old format to the new format:
 * OLD: { eventType, statusId, statusName, notes, date, id }
 * NEW: { title, description, date, id }
 * 
 * This migration removes the coupling between events and status changes.
 */
export const migrateEventsSchema: Migration = {
  id: '001',
  name: 'Migrate Events Schema',
  description: 'Convert event format from eventType/notes to title/description and remove status coupling',

  async execute(db: Db, dryRun: boolean): Promise<MigrationResult> {
    const errors: string[] = []
    let documentsModified = 0

    try {
      const collection = db.collection('applications')
      
      // Find all applications with events
      const applications = await collection.find({
        events: { $exists: true, $ne: [] }
      }).toArray()

      console.log(`   Found ${applications.length} applications with events`)

      for (const app of applications) {
        if (!app.events || !Array.isArray(app.events)) {
          continue
        }

        let hasOldFormat = false
        const migratedEvents = app.events.map((event: any) => {
          // Check if this event is in the old format
          if (event.eventType || event.statusId || event.statusName || event.notes) {
            hasOldFormat = true
            
            return {
              id: event.id,
              title: event.eventType || event.statusName || 'Event',
              description: event.notes || event.description,
              date: event.date
            }
          }
          
          // Already in new format or partially migrated
          return {
            id: event.id,
            title: event.title || event.eventType || 'Event',
            description: event.description || event.notes,
            date: event.date
          }
        })

        // Only update if we found events in the old format
        if (hasOldFormat) {
          if (!dryRun) {
            await collection.updateOne(
              { _id: app._id },
              { $set: { events: migratedEvents } }
            )
          }
          documentsModified++
          
          if (dryRun) {
            console.log(`   [DRY RUN] Would migrate ${app.events.length} events for application ${app._id}`)
          }
        }
      }

      return {
        success: true,
        message: `Successfully migrated events schema`,
        documentsModified,
        errors
      }

    } catch (error: any) {
      errors.push(error.message)
      return {
        success: false,
        message: `Failed to migrate events schema: ${error.message}`,
        documentsModified,
        errors
      }
    }
  },

  async rollback(db: Db): Promise<MigrationResult> {
    // Note: This rollback is limited because we've lost the original statusId/statusName data
    // In a real production scenario, you'd want to preserve this data during migration
    
    console.log('⚠️  WARNING: Events schema rollback will restore structure but cannot recover original statusId/statusName data')
    
    try {
      const collection = db.collection('applications')
      
      const applications = await collection.find({
        events: { $exists: true, $ne: [] }
      }).toArray()

      let documentsModified = 0

      for (const app of applications) {
        if (!app.events || !Array.isArray(app.events)) {
          continue
        }

        const rolledBackEvents = app.events.map((event: any) => ({
          id: event.id,
          eventType: event.title,
          statusId: 'unknown', // Cannot recover original statusId
          statusName: event.title,
          notes: event.description,
          date: event.date
        }))

        await collection.updateOne(
          { _id: app._id },
          { $set: { events: rolledBackEvents } }
        )
        
        documentsModified++
      }

      return {
        success: true,
        message: `Rolled back events schema for ${documentsModified} applications`,
        documentsModified,
        errors: ['WARNING: Original statusId values could not be recovered']
      }

    } catch (error: any) {
      return {
        success: false,
        message: `Failed to rollback events schema: ${error.message}`,
        documentsModified: 0,
        errors: [error.message]
      }
    }
  }
}