import { useState, useEffect } from 'react'
import { ApplicationStatus } from '../db/schemas'
import './EventRecordingForm.css'

interface EventRecordingFormProps {
  applicationId: string
  onEventCreated: () => void
}

interface FormData {
  title: string
  description: string
  date: string
}

interface FormState {
  loading: boolean
  error: string | null
}

export function EventRecordingForm({ applicationId, onEventCreated }: EventRecordingFormProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '', // Start empty - required field
    description: '', // Start empty - optional field
    date: new Date().toISOString().split('T')[0] // Default to today
  })
  const [formState, setFormState] = useState<FormState>({
    loading: false,
    error: null
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    if (!formData.title.trim()) {
      setFormState(prev => ({ ...prev, error: 'Please enter an event title' }))
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
          title: formData.title,
          description: formData.description || undefined,
          date: formData.date
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
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
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
          <label htmlFor="title" className="form-label">
            Event Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="form-input"
            placeholder="e.g., Phone screen scheduled, Interview completed, Offer received"
            disabled={formState.loading}
            required
          />
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

      <div className="form-group">
        <label htmlFor="description" className="form-label">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="form-textarea"
          placeholder="Additional details about this event..."
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
          disabled={formState.loading || !formData.title || !formData.date}
        >
          {formState.loading ? 'Adding Event...' : 'Add Event'}
        </button>
      </div>
    </form>
  )
}