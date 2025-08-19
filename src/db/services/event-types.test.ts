import { describe, it, expect } from 'vitest'
import { EventTypeService } from './event-types'

describe('EventTypeService', () => {
  const service = new EventTypeService()

  it('should return all event types as a flat list', () => {
    const eventTypes = service.getAllEventTypes()
    
    expect(eventTypes.length).toBeGreaterThan(30) // We have many event types
    
    // Verify structure
    eventTypes.forEach(eventType => {
      expect(eventType).toHaveProperty('id')
      expect(eventType).toHaveProperty('name')
      expect(eventType).toHaveProperty('description')
      expect(eventType).not.toHaveProperty('category') // Should not have category
      
      expect(typeof eventType.id).toBe('string')
      expect(typeof eventType.name).toBe('string')
      expect(typeof eventType.description).toBe('string')
    })
  })

  it('should include key event types', () => {
    const eventTypes = service.getAllEventTypes()
    const eventIds = eventTypes.map(et => et.id)
    
    expect(eventIds).toContain('application_submitted')
    expect(eventIds).toContain('phone_screen_scheduled')
    expect(eventIds).toContain('interview_completed')
    expect(eventIds).toContain('offer_received')
    expect(eventIds).toContain('rejected_by_employer')
  })

  it('should get event type by id', () => {
    const eventType = service.getEventTypeById('phone_screen_scheduled')
    
    expect(eventType).toBeTruthy()
    expect(eventType?.name).toBe('Phone Screen Scheduled')
    expect(eventType?.description).toBe('Phone screening interview was scheduled')
  })

  it('should return null for non-existent event type', () => {
    const eventType = service.getEventTypeById('non_existent_event')
    
    expect(eventType).toBeNull()
  })
})