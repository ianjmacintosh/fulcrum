import { createFileRoute } from '@tanstack/react-router'
import { requireUserAuth } from '../../../utils/route-guards'
import { EventRecordingForm } from '../../../components/EventRecordingForm'
import './details.css'

export const Route = createFileRoute('/applications/$id/details')({
  beforeLoad: requireUserAuth,
  loader: async ({ params }) => {
    // On server-side, skip loading data if user is not authenticated
    // Client will reload once auth context is available
    if (typeof window === 'undefined') {
      return { application: null }
    }
    
    try {
      const response = await fetch(`/api/applications/${params.id}`, { 
        credentials: 'include' 
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch application: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error('Application API returned error')
      }
      
      return { application: result.application }
    } catch (error) {
      console.error('Application details loader error:', error)
      throw error
    }
  },
  component: ApplicationDetails,
})

function ApplicationDetails() {
  const { application } = Route.useLoaderData()

  if (!application) {
    return (
      <div className="page">
        <div className="page-content">
          <p>Application not found</p>
        </div>
      </div>
    )
  }

  const formatApplicationType = (applicationType: 'cold' | 'warm') => {
    return applicationType === 'cold' ? 'Cold Application' : 'Warm Application'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleEventCreated = () => {
    // Refresh the page to show the new event
    window.location.reload()
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Application Details</h1>
        <p>View and manage your job application timeline</p>
      </header>

      <main className="page-content">
        <section className="application-info">
          <div className="info-card">
            <h2>{application.companyName}</h2>
            <h3>{application.roleName}</h3>
            <div className="application-metadata">
              <div className="metadata-item">
                <span className="metadata-label">Application Type:</span>
                <span className="metadata-value">{formatApplicationType(application.applicationType)}</span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Role Type:</span>
                <span className="metadata-value">
                  {application.roleType === 'manager' ? 'Manager' : 'Engineer'}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Location:</span>
                <span className="metadata-value">
                  {application.locationType === 'on-site' ? 'On-site' : 
                   application.locationType === 'hybrid' ? 'Hybrid' : 'Remote'}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Current Status:</span>
                <span className="metadata-value status-badge">
                  {application.currentStatus.name}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="events-timeline">
          <h2>Application Timeline</h2>
          <div className="timeline-table-container">
            <table className="timeline-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {application.events.map((event: any) => (
                  <tr key={event.id}>
                    <td className="event-date">
                      {formatDate(event.date)}
                    </td>
                    <td className="event-status">
                      {event.statusName}
                    </td>
                    <td className="event-notes">
                      {event.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="event-actions">
          <h2>Add Event</h2>
          <EventRecordingForm 
            applicationId={application._id} 
            onEventCreated={handleEventCreated}
          />
        </section>
      </main>
    </div>
  )
}