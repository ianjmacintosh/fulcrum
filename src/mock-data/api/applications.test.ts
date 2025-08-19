import { describe, it, expect } from 'vitest'
import applicationsData from './applications.json'
import { JobApplication } from '../../db/schemas'

describe('Applications Mock Data', () => {
  it('should have applications starting with "applied" events instead of cold/warm apply', () => {
    const applications = applicationsData.data as JobApplication[]
    
    for (const app of applications) {
      expect(app.events.length).toBeGreaterThan(0)
      
      // Find the first (earliest) event by date
      const sortedEvents = [...app.events].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      const firstEvent = sortedEvents[0]
      expect(firstEvent.statusName).toBe('Applied')
      expect(firstEvent.statusId).toBe('applied')
    }
  })

  it('should not contain cold_apply or warm_apply events', () => {
    const applications = applicationsData.data as JobApplication[]
    
    for (const app of applications) {
      for (const event of app.events) {
        expect(event.statusId).not.toBe('cold_apply')
        expect(event.statusId).not.toBe('warm_apply')
        expect(event.statusName).not.toBe('Cold Apply')
        expect(event.statusName).not.toBe('Warm Apply')
      }
    }
  })

  it('should preserve applicationType as cold/warm attribute on applications', () => {
    const applications = applicationsData.data as JobApplication[]
    
    for (const app of applications) {
      expect(['cold', 'warm']).toContain(app.applicationType)
    }
  })

  it('should have events with unique IDs', () => {
    const applications = applicationsData.data as JobApplication[]
    
    for (const app of applications) {
      const eventIds = app.events.map(e => e.id)
      const uniqueIds = new Set(eventIds)
      
      expect(eventIds).toHaveLength(uniqueIds.size) // No duplicate IDs
      
      for (const eventId of eventIds) {
        expect(eventId).toMatch(/^event_[a-f0-9-]{36}$/) // UUID format
      }
    }
  })
})