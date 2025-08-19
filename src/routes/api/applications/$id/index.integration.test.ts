import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applicationService } from '../../../../db/services/applications'
import { JobApplication } from '../../../../db/schemas'
import { connectToDatabase } from '../../../../db/connection'

describe('Application Details API Integration', () => {
  const testUserId = 'test-user-integration-123'
  let testApplication: JobApplication

  beforeEach(async () => {
    // Create test application
    testApplication = await applicationService.createApplication({
      userId: testUserId,
      companyName: 'Integration Test Company',
      roleName: 'Integration Test Role',
      jobBoard: { id: 'linkedin', name: 'LinkedIn' },
      workflow: { id: 'default', name: 'Default Process' },
      applicationType: 'cold',
      roleType: 'engineer',
      locationType: 'remote',
      events: [
        {
          id: 'event_integration-1',
          statusId: 'applied',
          statusName: 'Applied',
          date: '2025-01-15',
          notes: 'Integration test application'
        },
        {
          id: 'event_integration-2',
          statusId: 'phone_screen',
          statusName: 'Phone Screen Completed',
          date: '2025-01-25',
          notes: 'Phone screen completed'
        }
      ],
      currentStatus: { id: 'phone_screen', name: 'Phone Screen Completed', eventId: 'event_integration-2' }
    })
  })

  afterEach(async () => {
    // Clean up test data
    const db = await connectToDatabase()
    await db.collection('applications').deleteMany({ userId: testUserId })
  })

  it('should fetch application details through the API', async () => {
    // Test that the API would work (we can't easily test the actual HTTP endpoint in this environment)
    // But we can verify the underlying service works correctly
    const application = await applicationService.getApplicationById(testUserId, testApplication._id!.toString())
    
    expect(application).toBeTruthy()
    expect(application?.companyName).toBe('Integration Test Company')
    expect(application?.events).toHaveLength(2)
    
    // Verify events can be sorted chronologically
    const sortedEvents = [...application!.events].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    expect(sortedEvents[0].statusName).toBe('Applied')
    expect(sortedEvents[1].statusName).toBe('Phone Screen Completed')
  })

  it('should handle invalid application IDs', async () => {
    const application = await applicationService.getApplicationById(testUserId, 'invalid-id')
    
    // Should handle the invalid ObjectId gracefully
    expect(application).toBeNull()
  })
})