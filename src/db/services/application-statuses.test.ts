import { describe, it, expect, beforeEach } from 'vitest'
import { mockApplicationStatusService } from './mock-application-status-service'
import { ApplicationStatus } from '../schemas'

describe('ApplicationStatusService', () => {
  const testUserId = 'test-user-123'

  beforeEach(() => {
    // Clear mock data before each test
    mockApplicationStatusService.clear()
  })

  describe('createDefaultStatuses', () => {
    it('should create generic workflow statuses', async () => {
      const statuses = await mockApplicationStatusService.createDefaultStatuses(testUserId)
      
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
      const statuses = await mockApplicationStatusService.createDefaultStatuses(testUserId)
      
      const statusNames = statuses.map(s => s.name)
      expect(statusNames).not.toContain('Cold Apply')
      expect(statusNames).not.toContain('Warm Apply')
      expect(statusNames).not.toContain('cold_apply')
      expect(statusNames).not.toContain('warm_apply')
    })
  })


  describe('getAllStatuses', () => {
    it('should retrieve all statuses for a user', async () => {
      await mockApplicationStatusService.createDefaultStatuses(testUserId)
      
      const allStatuses = await mockApplicationStatusService.getAllStatuses(testUserId)
      
      expect(allStatuses).toHaveLength(7)
      expect(allStatuses.every(s => s.userId === testUserId)).toBe(true)
    })
  })
})