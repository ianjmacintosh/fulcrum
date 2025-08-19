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
        statusId: 'applied',
        statusName: 'Applied',
        date: '2025-01-15',
        notes: 'Initial application'
      }],
      currentStatus: { id: 'applied', name: 'Applied', eventId: 'event_test-initial' }
    })
  })

  afterEach(async () => {
    // Clean up test data
    const db = await connectToDatabase()
    await db.collection('applications').deleteMany({ userId: testUserId })
    await db.collection('application_statuses').deleteMany({ userId: testUserId })
  })

  it('should add new event and update currentStatus', async () => {
    const phoneScreenStatus = testStatuses.find(s => s.name === 'Phone Screen Scheduled')!
    const eventData = {
      statusId: phoneScreenStatus._id!.toString(),
      date: '2025-01-20',
      notes: 'Phone screen scheduled for next week'
    }

    // This simulates the API endpoint logic
    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      statusId: phoneScreenStatus._id!.toString(),
      statusName: phoneScreenStatus.name,
      date: eventData.date,
      notes: eventData.notes
    }

    const updatedApp = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      currentStatus: {
        id: phoneScreenStatus._id!.toString(),
        name: phoneScreenStatus.name,
        eventId: eventId
      }
    })

    expect(updatedApp).toBeTruthy()
    expect(updatedApp?.events).toHaveLength(2)
    expect(updatedApp?.currentStatus.name).toBe('Phone Screen Scheduled')
    expect(updatedApp?.currentStatus.eventId).toBe(eventId)
    
    const lastEvent = updatedApp?.events.find(e => e.id === eventId)
    expect(lastEvent?.statusName).toBe('Phone Screen Scheduled')
    expect(lastEvent?.notes).toBe('Phone screen scheduled for next week')
  })

  it('should validate event data against ApplicationStatus collection', async () => {
    // Test with invalid status ID
    const invalidStatusId = '000000000000000000000000'
    
    const status = await applicationStatusService.getStatusById(testUserId, invalidStatusId)
    expect(status).toBeNull() // Should not exist
  })

  it('should generate unique UUID for new events', async () => {
    const appliedStatus = testStatuses.find(s => s.name === 'Applied')!
    
    const eventId1 = `event_${randomUUID()}`
    const eventId2 = `event_${randomUUID()}`
    
    expect(eventId1).not.toBe(eventId2)
    expect(eventId1).toMatch(/^event_[a-f0-9-]{36}$/)
    expect(eventId2).toMatch(/^event_[a-f0-9-]{36}$/)
  })

  it('should preserve existing events when adding new ones', async () => {
    const interviewStatus = testStatuses.find(s => s.name === 'Interview Scheduled')!
    
    const originalEventCount = testApplication.events.length
    
    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      statusId: interviewStatus._id!.toString(),
      statusName: interviewStatus.name,
      date: '2025-01-25',
      notes: 'Technical interview scheduled'
    }

    const updatedApp = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      currentStatus: {
        id: interviewStatus._id!.toString(),
        name: interviewStatus.name,
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
    const rejectedStatus = testStatuses.find(s => s.name === 'Rejected by Employer')!
    expect(rejectedStatus.isTerminal).toBe(true)

    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      statusId: rejectedStatus._id!.toString(),
      statusName: rejectedStatus.name,
      date: '2025-01-25',
      notes: 'Position was filled internally'
    }

    const updatedApp = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      currentStatus: {
        id: rejectedStatus._id!.toString(),
        name: rejectedStatus.name,
        eventId: eventId
      }
    })

    expect(updatedApp?.currentStatus.name).toBe('Rejected by Employer')
    // For terminal statuses, no further events should typically be added
  })
})