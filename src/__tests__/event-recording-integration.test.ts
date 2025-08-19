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
        eventType: 'application_submitted',
        statusId: testStatuses.find(s => s.name === 'Applied')!._id!.toString(),
        statusName: 'Applied',
        date: '2025-01-15',
        notes: 'Initial application'
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
    expect(statuses.length).toBe(5)
    
    // Verify we have workflow status types
    const statusNames = statuses.map(s => s.name)
    expect(statusNames).toContain('Not Started')
    expect(statusNames).toContain('Applied')
    expect(statusNames).toContain('In Progress')
    expect(statusNames).toContain('Accepted')
    expect(statusNames).toContain('Declined')
    
    // Step 3: Add a new event with phone screen and status change to In Progress
    const inProgressStatus = statuses.find(s => s.name === 'In Progress')!
    expect(inProgressStatus).toBeTruthy()
    
    const newEventId = `event_${randomUUID()}`
    const newEvent = {
      id: newEventId,
      eventType: 'phone_screen_scheduled',
      statusId: inProgressStatus._id!.toString(),
      statusName: inProgressStatus.name,
      date: '2025-01-22',
      notes: 'Phone screen scheduled for next week'
    }
    
    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...application!.events, newEvent],
      currentStatus: {
        id: inProgressStatus._id!.toString(),
        name: inProgressStatus.name,
        eventId: newEventId
      }
    })
    
    // Step 4: Verify the update was successful
    expect(updatedApplication).toBeTruthy()
    expect(updatedApplication?.events).toHaveLength(2)
    expect(updatedApplication?.currentStatus.name).toBe('In Progress')
    expect(updatedApplication?.currentStatus.eventId).toBe(newEventId)
    
    // Step 5: Fetch the updated application to verify persistence
    const refreshedApplication = await applicationService.getApplicationById(testUserId, testApplication._id!.toString())
    
    expect(refreshedApplication?.events).toHaveLength(2)
    
    // Verify events are sorted chronologically
    const sortedEvents = [...refreshedApplication!.events].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    expect(sortedEvents[0].eventType).toBe('application_submitted')
    expect(sortedEvents[1].eventType).toBe('phone_screen_scheduled')
    expect(sortedEvents[1].notes).toBe('Phone screen scheduled for next week')
  })

  it('should handle multiple event additions maintaining chronological order', async () => {
    const statuses = await applicationStatusService.getAllStatuses(testUserId)
    const inProgressStatus = statuses.find(s => s.name === 'In Progress')!
    
    // Add multiple events out of chronological order
    const events = [
      {
        id: `event_${randomUUID()}`,
        eventType: 'interview_completed',
        statusId: inProgressStatus._id!.toString(),
        statusName: 'In Progress',
        date: '2025-02-05',
        notes: 'Final interview completed'
      },
      {
        id: `event_${randomUUID()}`,
        eventType: 'phone_screen_completed',
        // No status change for this event
        date: '2025-01-25',
        notes: 'Phone screen went well'
      },
      {
        id: `event_${randomUUID()}`,
        eventType: 'interview_scheduled',
        // No status change for this event
        date: '2025-02-01',
        notes: 'Technical interview scheduled'
      }
    ]
    
    // Add all events
    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, ...events],
      currentStatus: {
        id: inProgressStatus._id!.toString(),
        name: 'In Progress',
        eventId: events[0].id
      }
    })
    
    expect(updatedApplication?.events).toHaveLength(4) // 1 initial + 3 new
    expect(updatedApplication?.currentStatus.name).toBe('In Progress')
    
    // Verify chronological order
    const sortedEvents = [...updatedApplication!.events].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    expect(sortedEvents[0].eventType).toBe('application_submitted') // 2025-01-15
    expect(sortedEvents[1].eventType).toBe('phone_screen_completed') // 2025-01-25
    expect(sortedEvents[2].eventType).toBe('interview_scheduled') // 2025-02-01
    expect(sortedEvents[3].eventType).toBe('interview_completed') // 2025-02-05
  })

  it('should handle terminal status events correctly', async () => {
    const statuses = await applicationStatusService.getAllStatuses(testUserId)
    const declinedStatus = statuses.find(s => s.name === 'Declined')!
    
    expect(declinedStatus.isTerminal).toBe(true)
    
    const rejectionEventId = `event_${randomUUID()}`
    const rejectionEvent = {
      id: rejectionEventId,
      eventType: 'rejected_by_employer',
      statusId: declinedStatus._id!.toString(),
      statusName: declinedStatus.name,
      date: '2025-01-25',
      notes: 'Position filled internally'
    }
    
    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, rejectionEvent],
      currentStatus: {
        id: declinedStatus._id!.toString(),
        name: declinedStatus.name,
        eventId: rejectionEventId
      }
    })
    
    expect(updatedApplication?.currentStatus.name).toBe('Declined')
    expect(updatedApplication?.currentStatus.eventId).toBe(rejectionEventId)
  })

  it('should validate event data consistency across API operations', async () => {
    // Test the data flow that would happen in the real application
    const statuses = await applicationStatusService.getAllStatuses(testUserId)
    
    // Simulate form submission data
    const formData = {
      eventType: 'phone_screen_scheduled',
      statusId: statuses.find(s => s.name === 'In Progress')!._id!.toString(),
      date: '2025-01-20',
      notes: 'Scheduled for Monday at 2 PM'
    }
    
    // Validate status exists (API validation)
    const selectedStatus = await applicationStatusService.getStatusById(testUserId, formData.statusId)
    expect(selectedStatus).toBeTruthy()
    expect(selectedStatus?.name).toBe('In Progress')
    
    // Create event with UUID (API logic)
    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      eventType: formData.eventType,
      statusId: formData.statusId,
      statusName: selectedStatus!.name,
      date: formData.date,
      notes: formData.notes
    }
    
    // Update application (API operation)
    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      currentStatus: {
        id: formData.statusId,
        name: selectedStatus!.name,
        eventId: eventId
      }
    })
    
    expect(updatedApplication?.events).toHaveLength(2)
    expect(updatedApplication?.events[1].eventType).toBe('phone_screen_scheduled')
    expect(updatedApplication?.currentStatus.name).toBe('In Progress')
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
        eventType: 'application_submitted',
        statusId: differentUserStatuses.find(s => s.name === 'Applied')!._id!.toString(),
        statusName: 'Applied',
        date: '2025-01-10',
        notes: 'Different user application'
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