import { createFileRoute } from "@tanstack/react-router";
import { requireUserAuth } from "../../../utils/route-guards";
import { EventRecordingForm } from "../../../components/EventRecordingForm";
import { useApplications } from "../../../contexts/ApplicationsContext";
import "./details.css";

export const Route = createFileRoute("/applications/$id/details")({
  beforeLoad: requireUserAuth,
  component: ApplicationDetails,
});

function ApplicationDetails() {
  const { id } = Route.useParams();
  const {
    getApplication,
    isLoading,
    error,
    decryptionError,
    refreshApplications,
  } = useApplications();

  const application = getApplication(id);

  if (error) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="error-message">
            Failed to load applications: {error}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page">
        <div className="page-content">
          <div className="loading-message">Loading application...</div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="page">
        <div className="page-content">
          <p>Application not found</p>
        </div>
      </div>
    );
  }

  const formatApplicationType = (applicationType: "cold" | "warm") => {
    return applicationType === "cold" ? "Cold Application" : "Warm Application";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleEventCreated = () => {
    // Refresh applications from context to show the new event
    refreshApplications();
  };

  const handleStatusDateChange = async (dateField: string, value: string) => {
    try {
      const response = await fetch(`/api/applications/${application._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          [dateField]: value || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${dateField}`);
      }

      // Refresh applications from context to show the updated status
      refreshApplications();
    } catch (error) {
      console.error(`Error updating ${dateField}:`, error);
      // Could add a toast notification here
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Application Details</h1>
        <p>View and manage your job application timeline</p>
      </header>

      <main className="page-content">
        {decryptionError && (
          <div className="error-message">{decryptionError}</div>
        )}

        <section className="application-info">
          <div className="info-card">
            <h2>{application.companyName}</h2>
            <h3>{application.roleName}</h3>
            <div className="application-metadata">
              <div className="metadata-item">
                <span className="metadata-label">Application Type:</span>
                <span className="metadata-value">
                  {formatApplicationType(application.applicationType)}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Role Type:</span>
                <span className="metadata-value">
                  {application.roleType === "manager" ? "Manager" : "Engineer"}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Location:</span>
                <span className="metadata-value">
                  {application.locationType === "on-site"
                    ? "On-site"
                    : application.locationType === "hybrid"
                      ? "Hybrid"
                      : "Remote"}
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

        <section className="status-progression">
          <h2>Status Progression</h2>
          <div className="status-dates">
            <div className="status-date-group">
              <label htmlFor="appliedDate">Applied Date:</label>
              <input
                type="date"
                id="appliedDate"
                value={application.appliedDate || ""}
                onChange={(e) =>
                  handleStatusDateChange("appliedDate", e.target.value)
                }
              />
            </div>
            <div className="status-date-group">
              <label htmlFor="phoneScreenDate">Phone Screen Date:</label>
              <input
                type="date"
                id="phoneScreenDate"
                value={application.phoneScreenDate || ""}
                onChange={(e) =>
                  handleStatusDateChange("phoneScreenDate", e.target.value)
                }
              />
            </div>
            <div className="status-date-group">
              <label htmlFor="round1Date">Round 1 Date:</label>
              <input
                type="date"
                id="round1Date"
                value={application.round1Date || ""}
                onChange={(e) =>
                  handleStatusDateChange("round1Date", e.target.value)
                }
              />
            </div>
            <div className="status-date-group">
              <label htmlFor="round2Date">Round 2 Date:</label>
              <input
                type="date"
                id="round2Date"
                value={application.round2Date || ""}
                onChange={(e) =>
                  handleStatusDateChange("round2Date", e.target.value)
                }
              />
            </div>
            <div className="status-date-group">
              <label htmlFor="acceptedDate">Accepted Date:</label>
              <input
                type="date"
                id="acceptedDate"
                value={application.acceptedDate || ""}
                onChange={(e) =>
                  handleStatusDateChange("acceptedDate", e.target.value)
                }
              />
            </div>
            <div className="status-date-group">
              <label htmlFor="declinedDate">Declined Date:</label>
              <input
                type="date"
                id="declinedDate"
                value={application.declinedDate || ""}
                onChange={(e) =>
                  handleStatusDateChange("declinedDate", e.target.value)
                }
              />
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
                  <th>Event</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {application.events.map((event: any) => (
                  <tr key={event.id}>
                    <td className="event-date">{formatDate(event.date)}</td>
                    <td className="event-title">{event.title}</td>
                    <td className="event-description">
                      {event.description || "-"}
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
  );
}
