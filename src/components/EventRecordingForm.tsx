import { useState, useEffect } from 'react'
import { ApplicationStatus } from '../db/schemas'
import { EventType } from '../db/services/event-types'
import './EventRecordingForm.css'

interface EventRecordingFormProps {
  applicationId: string
  onEventCreated: () => void
}

interface FormData {
  eventType: string
  statusId: string
  date: string
  notes: string
}

interface FormState {
  loading: boolean
  error: string | null
}

export function EventRecordingForm({ applicationId, onEventCreated }: EventRecordingFormProps) {
  const [statuses, setStatuses] = useState<ApplicationStatus[]>([])
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [formData, setFormData] = useState<FormData>({
    eventType: '', // Start empty - required field
    statusId: '', // Start empty - optional field
    date: new Date().toISOString().split('T')[0], // Default to today
    notes: ''
  })
  const [formState, setFormState] = useState<FormState>({
    loading: false,
    error: null
  })

  // Load application statuses and event types on component mount
  useEffect(() => {
    loadStatuses()
    loadEventTypes()
  }, [])

  const loadStatuses = async () => {
    try {
      const response = await fetch('/api/application-statuses', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to load statuses')
      }

      const result = await response.json()
      if (result.success && result.statuses) {
        setStatuses(result.statuses)
      }
    } catch (error) {
      console.error('Error loading statuses:', error)
      setFormState(prev => ({ ...prev, error: 'Failed to load available statuses' }))
    }
  }

  const loadEventTypes = async () => {
    try {
      const response = await fetch('/api/event-types', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to load event types')
      }

      const result = await response.json()
      if (result.success && result.eventTypes) {
        setEventTypes(result.eventTypes)
      }
    } catch (error) {
      console.error('Error loading event types:', error)
      setFormState(prev => ({ ...prev, error: 'Failed to load available event types' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    if (!formData.eventType) {
      setFormState(prev => ({ ...prev, error: 'Please select an event type' }))
      return
    }
    
    if (!formData.date) {
      setFormState(prev => ({ ...prev, error: 'Please enter a date' }))
      return
    }

    if (!formData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setFormState(prev => ({ ...prev, error: 'Date must be in YYYY-MM-DD format' }))
      return
    }

    setFormState({ loading: true, error: null })

    try {
      const response = await fetch(`/api/applications/${applicationId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          eventType: formData.eventType,
          statusId: formData.statusId || undefined,
          date: formData.date,
          notes: formData.notes || undefined
        })
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.message || 'Failed to create event')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Failed to create event')
      }

      // Reset form after successful submission
      setFormData({
        eventType: '',
        statusId: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      })
      
      setFormState({ loading: false, error: null })
      
      // Notify parent component to refresh data
      onEventCreated()

    } catch (error: any) {
      console.error('Error creating event:', error)
      setFormState({ 
        loading: false, 
        error: error.message || 'Failed to create event' 
      })
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear any existing error when user starts typing
    if (formState.error) {
      setFormState(prev => ({ ...prev, error: null }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="event-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="eventType" className="form-label">
            What happened? *
          </label>
          <select
            id="eventType"
            value={formData.eventType}
            onChange={(e) => handleInputChange('eventType', e.target.value)}
            className="form-select"
            disabled={formState.loading}
            required
          >
            <option value="">Select an event type...</option>
            {eventTypes.map((eventType) => (
              <option key={eventType.id} value={eventType.id}>
                {eventType.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="eventDate" className="form-label">
            Date *
          </label>
          <input
            type="date"
            id="eventDate"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            className="form-input"
            disabled={formState.loading}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="statusId" className="form-label">
            Update application status? (optional)
          </label>
          <select
            id="statusId"
            value={formData.statusId}
            onChange={(e) => handleInputChange('statusId', e.target.value)}
            className="form-select"
            disabled={formState.loading}
          >
            <option value="">No status change</option>
            {statuses.map((status) => (
              <option key={status._id?.toString()} value={status._id?.toString()}>
                {status.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="notes" className="form-label">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          className="form-textarea"
          placeholder="Add any relevant notes about this event..."
          rows={3}
          disabled={formState.loading}
        />
      </div>

      {formState.error && (
        <div className="form-error">
          {formState.error}
        </div>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={formState.loading || !formData.eventType || !formData.date}
        >
          {formState.loading ? 'Adding Event...' : 'Add Event'}
        </button>
      </div>
    </form>
  )
}