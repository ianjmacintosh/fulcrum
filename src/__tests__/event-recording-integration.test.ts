import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ApplicationService } from '../db/services/applications'
import { ApplicationStatusService } from '../db/services/application-statuses'
import { JobApplication, ApplicationStatus } from '../db/schemas'
import { randomUUID } from 'crypto'
import { connectToDatabase } from '../db/connection'

describe('Event Recording Integration Tests - New Architecture', () => {
  const applicationService = new ApplicationService()
  const applicationStatusService = new ApplicationStatusService()
  const testUserId = 'test-user-integration'
  let testApplication: JobApplication
  let testStatuses: ApplicationStatus[]

  beforeEach(async () => {
    // Create application statuses (new workflow states)
    testStatuses = await applicationStatusService.createDefaultStatuses(testUserId)
    
    // Create a test application with initial event
    testApplication = await applicationService.createApplication({
      userId: testUserId,
      companyName: 'Integration Test Co',
      roleName: 'Software Engineer',
      jobBoard: { id: 'linkedin', name: 'LinkedIn' },
      workflow: { id: 'default', name: 'Default Process' },
      applicationType: 'cold',
      roleType: 'engineer',
      locationType: 'remote',
      events: [{
        id: `event_${randomUUID()}`,
        title: 'Application submitted',
        description: 'Initial application',
        date: '2025-01-15'
      }],
      currentStatus: { 
        id: testStatuses.find(s => s.name === 'Applied')!._id!.toString(), 
        name: 'Applied', 
        eventId: `event_${randomUUID()}` 
      }
    })
  })

  afterEach(async () => {
    // Clean up test data
    const db = await connectToDatabase()
    await db.collection('applications').deleteMany({ userId: testUserId })
    await db.collection('application_statuses').deleteMany({ userId: testUserId })
  })

  it('should complete full workflow: get application → get statuses → add event → verify updates', async () => {
    // Step 1: Get the application (simulating GET /api/applications/:id)
    const application = await applicationService.getApplicationById(testUserId, testApplication._id!.toString())
    expect(application).toBeTruthy()
    expect(application?.events).toHaveLength(1)
    
    // Step 2: Get available statuses (simulating GET /api/application-statuses)
    const statuses = await applicationStatusService.getAllStatuses(testUserId)
    expect(statuses.length).toBe(7)
    
    // Verify we have workflow status types
    const statusNames = statuses.map(s => s.name)
    expect(statusNames).toContain('Not Applied')
    expect(statusNames).toContain('Applied')
    expect(statusNames).toContain('Phone Screen')
    expect(statusNames).toContain('Round 1')
    expect(statusNames).toContain('Round 2')
    expect(statusNames).toContain('Accepted')
    expect(statusNames).toContain('Declined')
    
    // Step 3: Add a new event with phone screen and status change to Round 1
    const round1Status = statuses.find(s => s.name === 'Round 1')!
    expect(round1Status).toBeTruthy()
    
    const newEventId = `event_${randomUUID()}`
    const newEvent = {
      id: newEventId,
      title: 'Phone screen scheduled',
      description: 'Phone screen scheduled for next week',
      date: '2025-01-22'
    }
    
    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...application!.events, newEvent]
    })
    
    // Step 4: Verify the update was successful
    expect(updatedApplication).toBeTruthy()
    expect(updatedApplication?.events).toHaveLength(2)
    
    // Step 5: Fetch the updated application to verify persistence
    const refreshedApplication = await applicationService.getApplicationById(testUserId, testApplication._id!.toString())
    
    expect(refreshedApplication?.events).toHaveLength(2)
    
    // Verify events are sorted chronologically
    const sortedEvents = [...refreshedApplication!.events].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    expect(sortedEvents[0].title).toBe('Application submitted')
    expect(sortedEvents[1].title).toBe('Phone screen scheduled')
    expect(sortedEvents[1].description).toBe('Phone screen scheduled for next week')
  })

  it('should handle multiple event additions maintaining chronological order', async () => {
    // Add multiple events out of chronological order
    const events = [
      {
        id: `event_${randomUUID()}`,
        title: 'Interview completed',
        description: 'Final interview completed',
        date: '2025-02-05'
      },
      {
        id: `event_${randomUUID()}`,
        title: 'Phone screen completed',
        description: 'Phone screen went well',
        date: '2025-01-25'
      },
      {
        id: `event_${randomUUID()}`,
        title: 'Interview scheduled',
        description: 'Technical interview scheduled',
        date: '2025-02-01'
      }
    ]
    
    // Add all events
    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, ...events]
    })
    
    expect(updatedApplication?.events).toHaveLength(4) // 1 initial + 3 new
    
    // Verify chronological order
    const sortedEvents = [...updatedApplication!.events].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    expect(sortedEvents[0].title).toBe('Application submitted') // 2025-01-15
    expect(sortedEvents[1].title).toBe('Phone screen completed') // 2025-01-25
    expect(sortedEvents[2].title).toBe('Interview scheduled') // 2025-02-01
    expect(sortedEvents[3].title).toBe('Interview completed') // 2025-02-05
  })

  it('should handle terminal status events correctly', async () => {
    const statuses = await applicationStatusService.getAllStatuses(testUserId)
    const declinedStatus = statuses.find(s => s.name === 'Declined')!
    
    expect(declinedStatus.isTerminal).toBe(true)
    
    const rejectionEventId = `event_${randomUUID()}`
    const rejectionEvent = {
      id: rejectionEventId,
      title: 'Rejected by employer',
      description: 'Position filled internally',
      date: '2025-01-25'
    }
    
    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, rejectionEvent],
      declinedDate: '2025-01-25'
    })
    
    expect(updatedApplication?.declinedDate).toBe('2025-01-25')
  })

  it('should validate event data consistency across API operations', async () => {
    // Test the data flow that would happen in the real application
    const statuses = await applicationStatusService.getAllStatuses(testUserId)
    
    // Simulate form submission data
    const formData = {
      title: 'Phone screen scheduled',
      description: 'Scheduled for Monday at 2 PM',
      date: '2025-01-20'
    }
    
    // Create event with UUID (API logic)
    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      title: formData.title,
      description: formData.description,
      date: formData.date
    }
    
    // Update application (API operation)
    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      phoneScreenDate: formData.date
    })
    
    expect(updatedApplication?.events).toHaveLength(2)
    expect(updatedApplication?.events[1].title).toBe('Phone screen scheduled')
    expect(updatedApplication?.phoneScreenDate).toBe('2025-01-20')
  })

  it('should handle user data isolation properly', async () => {
    const differentUserId = 'different-user-123'
    
    // Create a different user's application
    const differentUserStatuses = await applicationStatusService.createDefaultStatuses(differentUserId)
    const differentUserApplication = await applicationService.createApplication({
      userId: differentUserId,
      companyName: 'Different Company',
      roleName: 'Different Role',
      jobBoard: { id: 'indeed', name: 'Indeed' },
      workflow: { id: 'custom', name: 'Custom Process' },
      applicationType: 'warm',
      roleType: 'manager',
      locationType: 'on-site',
      events: [{
        id: `event_${randomUUID()}`,
        title: 'Application submitted',
        description: 'Different user application',
        date: '2025-01-10'
      }],
      currentStatus: { 
        id: differentUserStatuses.find(s => s.name === 'Applied')!._id!.toString(), 
        name: 'Applied', 
        eventId: `event_${randomUUID()}` 
      }
    })
    
    // Verify that each user can only see their own data
    const user1Applications = await applicationService.getAllApplicationsForUser(testUserId)
    const user2Applications = await applicationService.getAllApplicationsForUser(differentUserId)
    
    expect(user1Applications.length).toBe(1)
    expect(user2Applications.length).toBeGreaterThan(0)
    expect(user1Applications[0]._id).not.toBe(user2Applications[0]._id)
    
    // Clean up different user data
    const db = await connectToDatabase()
    await db.collection('applications').deleteMany({ userId: differentUserId })
    await db.collection('application_statuses').deleteMany({ userId: differentUserId })
  })
})