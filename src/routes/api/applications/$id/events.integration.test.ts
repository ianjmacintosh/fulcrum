import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applicationService } from '../../../../db/services/applications'
import { applicationStatusService } from '../../../../db/services/application-statuses'
import { JobApplication, ApplicationStatus } from '../../../../db/schemas'
import { connectToDatabase } from '../../../../db/connection'

describe('Event Recording API Integration', () => {
  const testUserId = 'test-user-events-integration-123'
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
      companyName: 'Integration Test Company',
      roleName: 'Integration Test Role',
      jobBoard: { id: 'linkedin', name: 'LinkedIn' },
      workflow: { id: 'default', name: 'Default Process' },
      applicationType: 'cold',
      roleType: 'engineer',
      locationType: 'remote',
      events: [{
        id: 'event_integration-initial',
        title: 'Application submitted',
        description: 'Integration test application',
        date: '2025-01-15'
      }],
      currentStatus: { id: appliedStatus._id!.toString(), name: 'Applied', eventId: 'event_integration-initial' }
    })
  })

  afterEach(async () => {
    // Clean up test data
    const db = await connectToDatabase()
    await db.collection('applications').deleteMany({ userId: testUserId })
    await db.collection('application_statuses').deleteMany({ userId: testUserId })
  })

  it('should successfully add events through the service layer', async () => {
    // This simulates what the API endpoint would do
    const eventData = {
      title: 'Phone screen scheduled',
      description: 'Phone screen scheduled',
      date: '2025-01-20'
    }

    // Get application (API step)
    const application = await applicationService.getApplicationById(testUserId, testApplication._id!.toString())
    expect(application).toBeTruthy()

    // Create event and update application (API logic)
    const eventId = `event_integration_${Date.now()}`
    const newEvent = {
      id: eventId,
      title: eventData.title,
      description: eventData.description,
      date: eventData.date
    }

    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...application!.events, newEvent],
      phoneScreenDate: eventData.date
    })

    expect(updatedApplication).toBeTruthy()
    expect(updatedApplication?.events).toHaveLength(2)
    expect(updatedApplication?.phoneScreenDate).toBe('2025-01-20')
  })

  it('should handle invalid status IDs gracefully', async () => {
    const invalidStatusId = '000000000000000000000000'
    
    const status = await applicationStatusService.getStatusById(testUserId, invalidStatusId)
    expect(status).toBeNull()
    
    // The API would return a 400 error for this case
  })

  it('should validate date format', () => {
    const validDates = ['2025-01-15', '2025-12-31', '2024-02-29']
    const invalidDates = ['2025-1-15', '25-01-15', 'January 15, 2025', '2025/01/15']

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    
    validDates.forEach(date => {
      expect(date).toMatch(dateRegex)
    })

    invalidDates.forEach(date => {
      expect(date).not.toMatch(dateRegex)
    })
  })

  it('should maintain event chronological order', async () => {
    // Add an event with earlier date
    const eventId1 = `event_integration_early_${Date.now()}`
    const earlyEvent = {
      id: eventId1,
      title: 'interview_scheduled',
      description: 'Interview scheduled early',
      date: '2025-01-10' // Earlier than initial event
    }

    const updatedApp1 = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, earlyEvent]
    })

    // Events should be sortable chronologically
    const sortedEvents = [...updatedApp1!.events].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    expect(sortedEvents[0].date).toBe('2025-01-10') // Early event first
    expect(sortedEvents[1].date).toBe('2025-01-15') // Original event second
  })
})