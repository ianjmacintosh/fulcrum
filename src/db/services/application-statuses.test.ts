import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ApplicationStatusService } from './application-statuses'
import { ApplicationStatus } from '../schemas'
import { connectToDatabase } from '../connection'

describe('ApplicationStatusService', () => {
  let service: ApplicationStatusService
  const testUserId = 'test-user-123'

  beforeEach(() => {
    service = new ApplicationStatusService()
  })

  afterEach(async () => {
    // Clean up test data after each test
    const db = await connectToDatabase()
    await db.collection('application_statuses').deleteMany({ userId: testUserId })
  })

  describe('createDefaultStatuses', () => {
    it('should create predefined application statuses for timeline events', async () => {
      const statuses = await service.createDefaultStatuses(testUserId)
      
      expect(statuses).toHaveLength(11)
      
      // Check for key timeline event statuses
      const statusNames = statuses.map(s => s.name)
      expect(statusNames).toContain('Applied')
      expect(statusNames).toContain('Rejected by Employer')
      expect(statusNames).toContain('Rejected by Job Seeker') 
      expect(statusNames).toContain('Phone Screen Scheduled')
      expect(statusNames).toContain('Phone Screen Completed')
      expect(statusNames).toContain('Interview Scheduled')
      expect(statusNames).toContain('Interview Completed')
      expect(statusNames).toContain('Job Offer Received')
      expect(statusNames).toContain('Job Offer Accepted')
      expect(statusNames).toContain('Counteroffer by Employer')
      expect(statusNames).toContain('Counteroffer by Job Seeker')

      // Verify terminal statuses
      const rejectedByEmployer = statuses.find(s => s.name === 'Rejected by Employer')
      const rejectedByJobSeeker = statuses.find(s => s.name === 'Rejected by Job Seeker')
      const offerAccepted = statuses.find(s => s.name === 'Job Offer Accepted')
      
      expect(rejectedByEmployer?.isTerminal).toBe(true)
      expect(rejectedByJobSeeker?.isTerminal).toBe(true)
      expect(offerAccepted?.isTerminal).toBe(true)

      // Verify non-terminal statuses
      const applied = statuses.find(s => s.name === 'Applied')
      const phoneScreenScheduled = statuses.find(s => s.name === 'Phone Screen Scheduled')
      
      expect(applied?.isTerminal).toBe(false)
      expect(phoneScreenScheduled?.isTerminal).toBe(false)
    })

    it('should not create cold_apply or warm_apply statuses', async () => {
      const statuses = await service.createDefaultStatuses(testUserId)
      
      const statusNames = statuses.map(s => s.name)
      expect(statusNames).not.toContain('Cold Apply')
      expect(statusNames).not.toContain('Warm Apply')
      expect(statusNames).not.toContain('cold_apply')
      expect(statusNames).not.toContain('warm_apply')
    })
  })

  describe('getStatusById', () => {
    it('should retrieve a status by ID', async () => {
      const statuses = await service.createDefaultStatuses(testUserId)
      const appliedStatus = statuses.find(s => s.name === 'Applied')!
      
      const retrieved = await service.getStatusById(testUserId, appliedStatus._id!.toString())
      
      expect(retrieved).toBeTruthy()
      expect(retrieved?.name).toBe('Applied')
      expect(retrieved?.userId).toBe(testUserId)
    })
  })

  describe('getAllStatuses', () => {
    it('should retrieve all statuses for a user', async () => {
      await service.createDefaultStatuses(testUserId)
      
      const allStatuses = await service.getAllStatuses(testUserId)
      
      expect(allStatuses).toHaveLength(11)
      expect(allStatuses.every(s => s.userId === testUserId)).toBe(true)
    })
  })
})