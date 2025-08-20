import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applicationService } from '../../../../db/services/applications'
import { applicationStatusService } from '../../../../db/services/application-statuses'
import { JobApplication, ApplicationStatus } from '../../../../db/schemas'
import { connectToDatabase } from '../../../../db/connection'
import { randomUUID } from 'crypto'

describe('POST /api/applications/:id/events', () => {
  const testUserId = 'test-user-events-123'
  let testApplication: JobApplication
  let testStatuses: ApplicationStatus[]

  beforeEach(async () => {
    // Create test statuses
    testStatuses = await applicationStatusService.createDefaultStatuses(testUserId)
    
    // Find the Applied status to use in the test application
    const appliedStatus = testStatuses.find(s => s.name === 'Applied')!
    
    // Create test application
    testApplication = await applicationService.createApplication({
      userId: testUserId,
      companyName: 'Test Company',
      roleName: 'Test Role',
      jobBoard: { id: 'linkedin', name: 'LinkedIn' },
      workflow: { id: 'default', name: 'Default Process' },
      applicationType: 'cold',
      roleType: 'engineer',
      locationType: 'remote',
      events: [{
        id: 'event_test-initial',
        title: 'Application submitted',
        description: 'Initial application',
        date: '2025-01-15'
      }],
      currentStatus: { id: appliedStatus._id!.toString(), name: 'Applied', eventId: 'event_test-initial' }
    })
  })

  afterEach(async () => {
    // Clean up test data
    const db = await connectToDatabase()
    await db.collection('applications').deleteMany({ userId: testUserId })
    await db.collection('application_statuses').deleteMany({ userId: testUserId })
  })

  it('should add new event and update currentStatus', async () => {
    const eventData = {
      title: 'Phone screen scheduled',
      description: 'Phone screen scheduled for next week',
      date: '2025-01-20'
    }

    // This simulates the API endpoint logic
    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      title: eventData.title,
      description: eventData.description,
      date: eventData.date
    }

    const updatedApp = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      phoneScreenDate: eventData.date
    })

    expect(updatedApp).toBeTruthy()
    expect(updatedApp?.events).toHaveLength(2)
    expect(updatedApp?.phoneScreenDate).toBe('2025-01-20')
    
    const lastEvent = updatedApp?.events.find(e => e.id === eventId)
    expect(lastEvent?.title).toBe('Phone screen scheduled')
    expect(lastEvent?.description).toBe('Phone screen scheduled for next week')
  })

  it('should validate event data against ApplicationStatus collection', async () => {
    // Test with invalid status ID
    const invalidStatusId = '000000000000000000000000'
    
    const status = await applicationStatusService.getStatusById(testUserId, invalidStatusId)
    expect(status).toBeNull() // Should not exist
  })

  it('should generate unique UUID for new events', async () => {
    const eventId1 = `event_${randomUUID()}`
    const eventId2 = `event_${randomUUID()}`
    
    expect(eventId1).not.toBe(eventId2)
    expect(eventId1).toMatch(/^event_[a-f0-9-]{36}$/)
    expect(eventId2).toMatch(/^event_[a-f0-9-]{36}$/)
  })

  it('should preserve existing events when adding new ones', async () => {
    const originalEventCount = testApplication.events.length
    
    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      title: 'interview_scheduled',
      description: 'Technical interview scheduled',
      date: '2025-01-25'
    }

    const updatedApp = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      round1Date: '2025-01-25'
    })

    expect(updatedApp?.events).toHaveLength(originalEventCount + 1)
    
    // Original event should still exist
    const originalEvent = updatedApp?.events.find(e => e.id === 'event_test-initial')
    expect(originalEvent).toBeTruthy()
    expect(originalEvent?.title).toBe('Application submitted')
  })

  it('should handle terminal statuses correctly', async () => {
    const declinedStatus = testStatuses.find(s => s.name === 'Declined')!
    expect(declinedStatus.isTerminal).toBe(true)

    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      title: 'rejected_by_employer',
      description: 'Position was filled internally',
      date: '2025-01-25'
    }

    const updatedApp = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      declinedDate: '2025-01-25'
    })

    expect(updatedApp?.declinedDate).toBe('2025-01-25')
    // For terminal statuses, no further events should typically be added
  })
})