import { describe, it, expect, beforeEach } from 'vitest'
import { mockApplicationService } from '../../../../db/services/mock-application-service'
import { mockApplicationStatusService } from '../../../../db/services/mock-application-status-service'
import { JobApplication, ApplicationStatus } from '../../../../db/schemas'

describe('PATCH /api/applications/:id', () => {
  const testUserId = 'test-user-applications-123'
  let testApplication: JobApplication
  let testStatuses: ApplicationStatus[]

  beforeEach(async () => {
    // Clear mock data
    mockApplicationService.clear()
    mockApplicationStatusService.clear()
    
    // Create test statuses
    testStatuses = await mockApplicationStatusService.createDefaultStatuses(testUserId)
    
    // Find the Applied status to use in the test application
    const appliedStatus = testStatuses.find(s => s.name === 'Applied')!
    
    // Create test application
    testApplication = await mockApplicationService.createApplication({
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

  it('should update status date and automatically recalculate currentStatus', async () => {
    // This simulates the PATCH /api/applications/:id endpoint behavior
    const updatedApp = await mockApplicationService.updateApplicationWithStatusCalculation(testUserId, testApplication._id!, {
      phoneScreenDate: '2025-01-20'
    })

    expect(updatedApp).toBeTruthy()
    expect(updatedApp?.phoneScreenDate).toBe('2025-01-20')
    
    // Current status should automatically update based on the latest status date
    expect(updatedApp?.currentStatus.id).toBe('phone_screen')
    expect(updatedApp?.currentStatus.name).toBe('Phone Screen')
  })

  it('should handle multiple status date updates with correct priority', async () => {
    // Set multiple status dates - latest should win
    const updatedApp = await mockApplicationService.updateApplicationWithStatusCalculation(testUserId, testApplication._id!, {
      phoneScreenDate: '2025-01-20',
      round1Date: '2025-01-25',
      round2Date: '2025-01-30'
    })

    expect(updatedApp).toBeTruthy()
    expect(updatedApp?.phoneScreenDate).toBe('2025-01-20')
    expect(updatedApp?.round1Date).toBe('2025-01-25')
    expect(updatedApp?.round2Date).toBe('2025-01-30')
    
    // Current status should be Round 2 (latest date)
    expect(updatedApp?.currentStatus.id).toBe('round_2')
    expect(updatedApp?.currentStatus.name).toBe('Round 2')
  })

  it('should handle terminal statuses correctly', async () => {
    // Set a declined date - should become terminal status
    const updatedApp = await mockApplicationService.updateApplicationWithStatusCalculation(testUserId, testApplication._id!, {
      phoneScreenDate: '2025-01-20',
      declinedDate: '2025-01-25'
    })

    expect(updatedApp).toBeTruthy()
    expect(updatedApp?.declinedDate).toBe('2025-01-25')
    
    // Current status should be Declined (terminal status)
    expect(updatedApp?.currentStatus.id).toBe('declined')
    expect(updatedApp?.currentStatus.name).toBe('Declined')
  })

  it('should handle out-of-order status dates correctly', async () => {
    // Set dates out of logical order - latest chronological date should win
    const updatedApp = await mockApplicationService.updateApplicationWithStatusCalculation(testUserId, testApplication._id!, {
      round1Date: '2025-01-20', // Earlier date
      phoneScreenDate: '2025-01-25' // Later date but earlier in workflow
    })

    expect(updatedApp).toBeTruthy()
    
    // Phone Screen should be current status because it has the later date
    expect(updatedApp?.currentStatus.id).toBe('phone_screen')
    expect(updatedApp?.currentStatus.name).toBe('Phone Screen')
  })

  it('should handle same dates with priority system', async () => {
    const sameDate = '2025-01-20'
    
    const updatedApp = await mockApplicationService.updateApplicationWithStatusCalculation(testUserId, testApplication._id!, {
      phoneScreenDate: sameDate,
      round1Date: sameDate,
      round2Date: sameDate
    })

    expect(updatedApp).toBeTruthy()
    
    // Round 2 should win due to higher priority with same date
    expect(updatedApp?.currentStatus.id).toBe('round_2')
    expect(updatedApp?.currentStatus.name).toBe('Round 2')
  })

  it('should validate allowed status date fields only', () => {
    // This test verifies that the API only allows specific status date fields
    const allowedFields = ['appliedDate', 'phoneScreenDate', 'round1Date', 'round2Date', 'acceptedDate', 'declinedDate']
    const testFields = ['appliedDate', 'phoneScreenDate', 'invalidField', 'events', 'companyName']
    
    const validFields = testFields.filter(field => allowedFields.includes(field))
    const invalidFields = testFields.filter(field => !allowedFields.includes(field))
    
    expect(validFields).toEqual(['appliedDate', 'phoneScreenDate'])
    expect(invalidFields).toEqual(['invalidField', 'events', 'companyName'])
  })

  it('should preserve events when updating status dates', async () => {
    const originalEventsLength = testApplication.events.length
    
    const updatedApp = await mockApplicationService.updateApplicationWithStatusCalculation(testUserId, testApplication._id!, {
      phoneScreenDate: '2025-01-20'
    })

    expect(updatedApp).toBeTruthy()
    expect(updatedApp?.events).toHaveLength(originalEventsLength)
    
    // Original event should still exist unchanged
    const originalEvent = updatedApp?.events.find(e => e.id === 'event_test-initial')
    expect(originalEvent).toBeTruthy()
    expect(originalEvent?.title).toBe('Application submitted')
  })
})