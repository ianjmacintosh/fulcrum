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
      
      expect(statuses).toHaveLength(5)
      
      // Check for workflow statuses
      const statusNames = statuses.map(s => s.name)
      expect(statusNames).toContain('Not Started')
      expect(statusNames).toContain('Applied')
      expect(statusNames).toContain('In Progress')
      expect(statusNames).toContain('Accepted')
      expect(statusNames).toContain('Declined')

      // Verify terminal statuses
      const accepted = statuses.find(s => s.name === 'Accepted')
      const declined = statuses.find(s => s.name === 'Declined')
      
      expect(accepted?.isTerminal).toBe(true)
      expect(declined?.isTerminal).toBe(true)

      // Verify non-terminal statuses
      const notStarted = statuses.find(s => s.name === 'Not Started')
      const applied = statuses.find(s => s.name === 'Applied')
      const inProgress = statuses.find(s => s.name === 'In Progress')
      
      expect(notStarted?.isTerminal).toBe(false)
      expect(applied?.isTerminal).toBe(false)
      expect(inProgress?.isTerminal).toBe(false)
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
      
      expect(allStatuses).toHaveLength(5)
      expect(allStatuses.every(s => s.userId === testUserId)).toBe(true)
    })
  })
})