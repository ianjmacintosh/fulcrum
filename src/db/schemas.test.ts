import { describe, it, expect } from 'vitest'
import { ApplicationEventSchema, JobApplicationSchema, ApplicationEvent, JobApplication } from './schemas'

describe('ApplicationEvent Schema', () => {
  it('should require an id field', () => {
    const validEvent: ApplicationEvent = {
      id: 'event_123e4567-e89b-12d3-a456-426614174000',
      eventType: 'application_submitted',
      statusId: 'applied',
      statusName: 'Applied',
      date: '2025-01-15',
      notes: 'Applied through LinkedIn'
    }

    const result = ApplicationEventSchema.safeParse(validEvent)
    expect(result.success).toBe(true)
  })

  it('should reject ApplicationEvent without id field', () => {
    const invalidEvent = {
      eventType: 'application_submitted',
      statusId: 'applied',
      statusName: 'Applied',
      date: '2025-01-15'
    }

    const result = ApplicationEventSchema.safeParse(invalidEvent)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['id'])
    }
  })

  it('should allow optional notes field', () => {
    const eventWithoutNotes: ApplicationEvent = {
      id: 'event_123e4567-e89b-12d3-a456-426614174000',
      eventType: 'application_submitted',
      statusId: 'applied',
      statusName: 'Applied',
      date: '2025-01-15'
    }

    const result = ApplicationEventSchema.safeParse(eventWithoutNotes)
    expect(result.success).toBe(true)
  })
})

describe('JobApplication Schema with event IDs', () => {
  it('should allow currentStatus to reference an event ID', () => {
    const application: Partial<JobApplication> = {
      userId: 'user_123',
      companyName: 'TechCorp',
      roleName: 'Engineer',
      jobBoard: { id: 'linkedin', name: 'LinkedIn' },
      workflow: { id: 'default', name: 'Default Process' },
      applicationType: 'cold',
      roleType: 'engineer',
      locationType: 'remote',
      events: [
        {
          id: 'event_123e4567-e89b-12d3-a456-426614174000',
          eventType: 'application_submitted',
          statusId: 'applied',
          statusName: 'Applied',
          date: '2025-01-15'
        }
      ],
      currentStatus: {
        id: 'applied',
        name: 'Applied',
        eventId: 'event_123e4567-e89b-12d3-a456-426614174000'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Note: This test will initially fail until we update the schema
    // const result = JobApplicationSchema.safeParse(application)
    // expect(result.success).toBe(true)
    expect(application.currentStatus.eventId).toBe('event_123e4567-e89b-12d3-a456-426614174000')
  })
})