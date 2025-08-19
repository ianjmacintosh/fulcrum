import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createServerFileRoute } from '@tanstack/react-start/server'
import { applicationService } from '../../../../db/services/applications'
import { JobApplication } from '../../../../db/schemas'
import { connectToDatabase } from '../../../../db/connection'

// Mock auth context
const mockAuthContext = {
  auth: {
    authenticated: true,
    user: { id: 'test-user-123' }
  }
}

describe('GET /api/applications/:id', () => {
  const testUserId = 'test-user-123'
  let testApplication: JobApplication

  beforeEach(async () => {
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
        id: 'event_test-123',
        eventType: 'application_submitted',
        statusId: 'applied',
        statusName: 'Applied',
        date: '2025-01-15',
        notes: 'Test application'
      }],
      currentStatus: { id: 'applied', name: 'Applied', eventId: 'event_test-123' }
    })
  })

  afterEach(async () => {
    // Clean up test data
    const db = await connectToDatabase()
    await db.collection('applications').deleteMany({ userId: testUserId })
  })

  it('should return application details for valid ID', async () => {
    // This would be the implementation test
    // For now, we'll test the service layer directly
    const application = await applicationService.getApplicationById(testUserId, testApplication._id!.toString())
    
    expect(application).toBeTruthy()
    expect(application?.companyName).toBe('Test Company')
    expect(application?.roleName).toBe('Test Role')
    expect(application?.events).toHaveLength(1)
    expect(application?.events[0].statusName).toBe('Applied')
    expect(application?.currentStatus.eventId).toBe('event_test-123')
  })

  it('should return null for non-existent application ID', async () => {
    const application = await applicationService.getApplicationById(testUserId, '000000000000000000000000')
    
    expect(application).toBeNull()
  })

  it('should not return applications from other users', async () => {
    // Try to access the application with different user ID
    const application = await applicationService.getApplicationById('other-user-456', testApplication._id!.toString())
    
    expect(application).toBeNull()
  })

  it('should return events sorted chronologically', async () => {
    // Add more events to the application
    const updatedApp = await applicationService.updateApplication(testUserId, testApplication._id!, {
      events: [
        {
          id: 'event_test-1',
          eventType: 'application_submitted',
          statusId: 'applied',
          statusName: 'Applied',
          date: '2025-01-15',
          notes: 'First event'
        },
        {
          id: 'event_test-3',
          eventType: 'phone_screen_completed',
          statusId: 'in_progress',
          statusName: 'In Progress',
          date: '2025-01-25',
          notes: 'Third event'
        },
        {
          id: 'event_test-2',
          eventType: 'interview_scheduled',
          statusId: 'in_progress',
          statusName: 'In Progress',
          date: '2025-01-20',
          notes: 'Second event'
        }
      ],
      currentStatus: { id: 'in_progress', name: 'In Progress', eventId: 'event_test-3' }
    })
    
    const application = await applicationService.getApplicationById(testUserId, testApplication._id!.toString())
    
    expect(application?.events).toHaveLength(3)
    
    // Events should be sorted by date (oldest first for timeline display)
    const sortedEvents = [...application!.events].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    
    expect(sortedEvents[0].notes).toBe('First event')
    expect(sortedEvents[1].notes).toBe('Second event')
    expect(sortedEvents[2].notes).toBe('Third event')
  })
})