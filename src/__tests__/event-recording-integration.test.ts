import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applicationService } from '../db/services/applications'
import { applicationStatusService } from '../db/services/application-statuses'
import { JobApplication, ApplicationStatus } from '../db/schemas'
import { connectToDatabase } from '../db/connection'
import { randomUUID } from 'crypto'

describe('Event Recording Integration Tests', () => {
  const testUserId = 'integration-test-user'
  let testApplication: JobApplication
  let testStatuses: ApplicationStatus[]

  beforeEach(async () => {
    // Create application statuses
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
        statusId: 'applied',
        statusName: 'Applied',
        date: '2025-01-15',
        notes: 'Initial application'
      }],
      currentStatus: { id: 'applied', name: 'Applied', eventId: `event_${randomUUID()}` }
    })
  })

  afterEach(async () => {
    // Clean up test data
    const db = await connectToDatabase()
    await db.collection('applications').deleteMany({ userId: testUserId })
    await db.collection('application_statuses').deleteMany({ userId: testUserId })
  })

  it('should complete full workflow: get application → get statuses → add event → verify updates', async () => {
    // Step 1: Fetch application details (simulating GET /api/applications/:id)
    const application = await applicationService.getApplicationById(testUserId, testApplication._id!.toString())
    
    expect(application).toBeTruthy()
    expect(application?.companyName).toBe('Integration Test Co')
    expect(application?.events).toHaveLength(1)
    expect(application?.events[0].statusName).toBe('Applied')
    
    // Step 2: Fetch available statuses (simulating GET /api/application-statuses)
    const statuses = await applicationStatusService.getAllStatuses(testUserId)
    
    expect(statuses).toBeTruthy()
    expect(statuses.length).toBeGreaterThan(0)
    
    // Verify we have key status types
    const statusNames = statuses.map(s => s.name)
    expect(statusNames).toContain('Applied')
    expect(statusNames).toContain('Phone Screen Scheduled')
    expect(statusNames).toContain('Phone Screen Completed')
    expect(statusNames).toContain('Job Offer Received')
    expect(statusNames).toContain('Rejected by Employer')
    
    // Step 3: Add a new event (simulating POST /api/applications/:id/events)
    const phoneScreenStatus = statuses.find(s => s.name === 'Phone Screen Scheduled')!
    expect(phoneScreenStatus).toBeTruthy()
    
    const newEventId = `event_${randomUUID()}`
    const newEvent = {
      id: newEventId,
      statusId: phoneScreenStatus._id!.toString(),
      statusName: phoneScreenStatus.name,
      date: '2025-01-22',
      notes: 'Phone screen scheduled for next week'
    }
    
    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...application!.events, newEvent],
      currentStatus: {
        id: phoneScreenStatus._id!.toString(),
        name: phoneScreenStatus.name,
        eventId: newEventId
      }
    })
    
    // Step 4: Verify the update was successful
    expect(updatedApplication).toBeTruthy()
    expect(updatedApplication?.events).toHaveLength(2)
    expect(updatedApplication?.currentStatus.name).toBe('Phone Screen Scheduled')
    expect(updatedApplication?.currentStatus.eventId).toBe(newEventId)
    
    // Step 5: Fetch the updated application to verify persistence
    const refreshedApplication = await applicationService.getApplicationById(testUserId, testApplication._id!.toString())
    
    expect(refreshedApplication?.events).toHaveLength(2)
    
    // Events should be sortable chronologically
    const sortedEvents = [...refreshedApplication!.events].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    expect(sortedEvents[0].statusName).toBe('Applied')
    expect(sortedEvents[1].statusName).toBe('Phone Screen Scheduled')
    expect(sortedEvents[1].notes).toBe('Phone screen scheduled for next week')
  })

  it('should handle multiple event additions maintaining chronological order', async () => {
    const statuses = await applicationStatusService.getAllStatuses(testUserId)
    
    // Add multiple events out of chronological order
    const events = [
      {
        id: `event_${randomUUID()}`,
        statusId: statuses.find(s => s.name === 'Interview Completed')!._id!.toString(),
        statusName: 'Interview Completed',
        date: '2025-02-05',
        notes: 'Final interview completed'
      },
      {
        id: `event_${randomUUID()}`,
        statusId: statuses.find(s => s.name === 'Phone Screen Completed')!._id!.toString(),
        statusName: 'Phone Screen Completed',
        date: '2025-01-25',
        notes: 'Phone screen went well'
      },
      {
        id: `event_${randomUUID()}`,
        statusId: statuses.find(s => s.name === 'Interview Scheduled')!._id!.toString(),
        statusName: 'Interview Scheduled',
        date: '2025-02-01',
        notes: 'Technical interview scheduled'
      }
    ]
    
    // Add all events
    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, ...events],
      currentStatus: {
        id: statuses.find(s => s.name === 'Interview Completed')!._id!.toString(),
        name: 'Interview Completed',
        eventId: events[0].id
      }
    })
    
    expect(updatedApplication?.events).toHaveLength(4) // 1 initial + 3 new
    
    // Verify chronological sorting works
    const sortedEvents = [...updatedApplication!.events].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    expect(sortedEvents[0].statusName).toBe('Applied') // 2025-01-15
    expect(sortedEvents[1].statusName).toBe('Phone Screen Completed') // 2025-01-25
    expect(sortedEvents[2].statusName).toBe('Interview Scheduled') // 2025-02-01
    expect(sortedEvents[3].statusName).toBe('Interview Completed') // 2025-02-05
  })

  it('should handle terminal status events correctly', async () => {
    const statuses = await applicationStatusService.getAllStatuses(testUserId)
    const rejectedStatus = statuses.find(s => s.name === 'Rejected by Employer')!
    
    expect(rejectedStatus.isTerminal).toBe(true)
    
    const rejectionEventId = `event_${randomUUID()}`
    const rejectionEvent = {
      id: rejectionEventId,
      statusId: rejectedStatus._id!.toString(),
      statusName: rejectedStatus.name,
      date: '2025-01-30',
      notes: 'Position was filled internally'
    }
    
    const updatedApplication = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, rejectionEvent],
      currentStatus: {
        id: rejectedStatus._id!.toString(),
        name: rejectedStatus.name,
        eventId: rejectionEventId
      }
    })
    
    expect(updatedApplication?.currentStatus.name).toBe('Rejected by Employer')
    expect(updatedApplication?.currentStatus.eventId).toBe(rejectionEventId)
    
    // Verify terminal status is properly marked
    const finalStatus = statuses.find(s => s._id!.toString() === updatedApplication?.currentStatus.id)
    expect(finalStatus?.isTerminal).toBe(true)
  })

  it('should validate event data consistency across API operations', async () => {
    // Test the data flow that would happen in the real application
    const statuses = await applicationStatusService.getAllStatuses(testUserId)
    
    // Simulate form submission data
    const formData = {
      statusId: statuses.find(s => s.name === 'Phone Screen Scheduled')!._id!.toString(),
      date: '2025-01-20',
      notes: 'Scheduled for Monday at 2 PM'
    }
    
    // Validate status exists (API validation)
    const selectedStatus = await applicationStatusService.getStatusById(testUserId, formData.statusId)
    expect(selectedStatus).toBeTruthy()
    expect(selectedStatus?.name).toBe('Phone Screen Scheduled')
    
    // Create event with UUID (API logic)
    const eventId = `event_${randomUUID()}`
    const newEvent = {
      id: eventId,
      statusId: formData.statusId,
      statusName: selectedStatus!.name,
      date: formData.date,
      notes: formData.notes
    }
    
    // Update application (API persistence)
    const updatedApp = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [...testApplication.events, newEvent],
      currentStatus: {
        id: formData.statusId,
        name: selectedStatus!.name,
        eventId: eventId
      }
    })
    
    // Verify all data is consistent
    expect(updatedApp?.currentStatus.name).toBe(selectedStatus!.name)
    expect(updatedApp?.currentStatus.eventId).toBe(eventId)
    
    const addedEvent = updatedApp?.events.find(e => e.id === eventId)
    expect(addedEvent?.statusName).toBe(selectedStatus!.name)
    expect(addedEvent?.date).toBe(formData.date)
    expect(addedEvent?.notes).toBe(formData.notes)
  })
  
  it('should handle user data isolation properly', async () => {
    const otherUserId = 'other-user-123'
    
    // Create statuses for other user
    await applicationStatusService.createDefaultStatuses(otherUserId)
    
    // Create application for other user  
    const otherApplication = await applicationService.createApplication({
      userId: otherUserId,
      companyName: 'Other Company',
      roleName: 'Other Role',
      jobBoard: { id: 'linkedin', name: 'LinkedIn' },
      workflow: { id: 'default', name: 'Default Process' },
      applicationType: 'warm',
      roleType: 'manager',
      locationType: 'on-site',
      events: [{
        id: `event_${randomUUID()}`,
        statusId: 'applied',
        statusName: 'Applied',
        date: '2025-01-20',
        notes: 'Other user application'
      }],
      currentStatus: { id: 'applied', name: 'Applied', eventId: `event_${randomUUID()}` }
    })
    
    // Verify users cannot access each other's data
    const crossUserApplication = await applicationService.getApplicationById(testUserId, otherApplication._id!.toString())
    expect(crossUserApplication).toBeNull()
    
    const crossUserStatuses = await applicationStatusService.getAllStatuses(testUserId)
    const otherUserStatuses = await applicationStatusService.getAllStatuses(otherUserId)
    
    // Both should have the same number of statuses but different user IDs
    expect(crossUserStatuses).toHaveLength(otherUserStatuses.length)
    expect(crossUserStatuses.every(s => s.userId === testUserId)).toBe(true)
    expect(otherUserStatuses.every(s => s.userId === otherUserId)).toBe(true)
    
    // Clean up other user data
    const db = await connectToDatabase()
    await db.collection('applications').deleteMany({ userId: otherUserId })
    await db.collection('application_statuses').deleteMany({ userId: otherUserId })
  })
})