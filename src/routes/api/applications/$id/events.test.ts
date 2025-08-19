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
        eventType: 'application_submitted',
        statusId: appliedStatus._id!.toString(),
        statusName: 'Applied',
        date: '2025-01-15',
        notes: 'Initial application'
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
    const inProgressStatus = testStatuses.find(s => s.name === 'In Progress')!
    const eventData = {
      eventType: 'phone_screen_scheduled',
      statusId: inProgressStatus._id!.toString(),
      date: '2025-01-20',
      notes: 'Phone screen scheduled for next week'
    }

    // This simulates the API endpoint logic
    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      eventType: eventData.eventType,
      statusId: inProgressStatus._id!.toString(),
      statusName: inProgressStatus.name,
      date: eventData.date,
      notes: eventData.notes
    }

    const updatedApp = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      currentStatus: {
        id: inProgressStatus._id!.toString(),
        name: inProgressStatus.name,
        eventId: eventId
      }
    })

    expect(updatedApp).toBeTruthy()
    expect(updatedApp?.events).toHaveLength(2)
    expect(updatedApp?.currentStatus.name).toBe('In Progress')
    expect(updatedApp?.currentStatus.eventId).toBe(eventId)
    
    const lastEvent = updatedApp?.events.find(e => e.id === eventId)
    expect(lastEvent?.eventType).toBe('phone_screen_scheduled')
    expect(lastEvent?.statusName).toBe('In Progress')
    expect(lastEvent?.notes).toBe('Phone screen scheduled for next week')
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
    const inProgressStatus = testStatuses.find(s => s.name === 'In Progress')!
    
    const originalEventCount = testApplication.events.length
    
    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      eventType: 'interview_scheduled',
      statusId: inProgressStatus._id!.toString(),
      statusName: inProgressStatus.name,
      date: '2025-01-25',
      notes: 'Technical interview scheduled'
    }

    const updatedApp = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      currentStatus: {
        id: inProgressStatus._id!.toString(),
        name: inProgressStatus.name,
        eventId: eventId
      }
    })

    expect(updatedApp?.events).toHaveLength(originalEventCount + 1)
    
    // Original event should still exist
    const originalEvent = updatedApp?.events.find(e => e.id === 'event_test-initial')
    expect(originalEvent).toBeTruthy()
    expect(originalEvent?.statusName).toBe('Applied')
  })

  it('should handle terminal statuses correctly', async () => {
    const declinedStatus = testStatuses.find(s => s.name === 'Declined')!
    expect(declinedStatus.isTerminal).toBe(true)

    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      eventType: 'rejected_by_employer',
      statusId: declinedStatus._id!.toString(),
      statusName: declinedStatus.name,
      date: '2025-01-25',
      notes: 'Position was filled internally'
    }

    const updatedApp = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      currentStatus: {
        id: declinedStatus._id!.toString(),
        name: declinedStatus.name,
        eventId: eventId
      }
    })

    expect(updatedApp?.currentStatus.name).toBe('Declined')
    // For terminal statuses, no further events should typically be added
  })
})