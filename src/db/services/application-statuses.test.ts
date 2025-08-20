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
    it('should create generic workflow statuses', async () => {
      const statuses = await service.createDefaultStatuses(testUserId)
      
      expect(statuses).toHaveLength(7)
      
      // Check for workflow statuses
      const statusNames = statuses.map(s => s.name)
      expect(statusNames).toContain('Not Applied')
      expect(statusNames).toContain('Applied')
      expect(statusNames).toContain('Phone Screen')
      expect(statusNames).toContain('Round 1')
      expect(statusNames).toContain('Round 2')
      expect(statusNames).toContain('Accepted')
      expect(statusNames).toContain('Declined')

      // Verify terminal statuses
      const accepted = statuses.find(s => s.name === 'Accepted')
      const declined = statuses.find(s => s.name === 'Declined')
      
      expect(accepted?.isTerminal).toBe(true)
      expect(declined?.isTerminal).toBe(true)

      // Verify non-terminal statuses
      const notApplied = statuses.find(s => s.name === 'Not Applied')
      const applied = statuses.find(s => s.name === 'Applied')
      const phoneScreen = statuses.find(s => s.name === 'Phone Screen')
      const round1 = statuses.find(s => s.name === 'Round 1')
      const round2 = statuses.find(s => s.name === 'Round 2')
      
      expect(notApplied?.isTerminal).toBe(false)
      expect(applied?.isTerminal).toBe(false)
      expect(phoneScreen?.isTerminal).toBe(false)
      expect(round1?.isTerminal).toBe(false)
      expect(round2?.isTerminal).toBe(false)
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
      
      expect(allStatuses).toHaveLength(7)
      expect(allStatuses.every(s => s.userId === testUserId)).toBe(true)
    })
  })
})