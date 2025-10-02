import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { requireUserAuth } from "../../utils/route-guards";
import { JobApplicationCardsList } from "../../components/JobApplicationCardsList";
import { useApplications } from "../../contexts/ApplicationsContext";
import "./index.css";

export const Route = createFileRoute("/applications/")({
  beforeLoad: requireUserAuth,
  component: Applications,
});

function Applications() {
  const { applications, isLoading, error, decryptionError } = useApplications();

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

  return (
    <div className="page">
      <header className="page-header">
        <h1>Applications</h1>
        <p>
          Track all applications and update job status throughout the process
        </p>
      </header>

      <main className="page-content">
        {decryptionError && (
          <div className="error-message">{decryptionError}</div>
        )}

        {isLoading ? (
          <div className="loading-message">Loading applications...</div>
        ) : (
          <>
            <section className="applications-summary">
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="summary-label">Total Applications</span>
                  <span className="summary-value">{applications.length}</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Open Applications</span>
                  <span className="summary-value">
                    {
                      applications.filter(
                        (app: any) =>
                          !["rejected", "declined", "withdrawn"].includes(
                            app.currentStatus.id.toLowerCase(),
                          ),
                      ).length
                    }
                  </span>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Closed/Rejected</span>
                  <span className="summary-value">
                    {
                      applications.filter((app: any) =>
                        ["rejected", "declined", "withdrawn"].includes(
                          app.currentStatus.id.toLowerCase(),
                        ),
                      ).length
                    }
                  </span>
                </div>
              </div>
            </section>

            <section className="add-application">
              <Link to="/applications/new" className="add-button">
                + Add New Application
              </Link>
              <Link to="/applications/import" className="import-button">
                Import from CSV
              </Link>
            </section>

            <JobApplicationCardsList applications={applications} />

            <section className="add-application">
              <Link to="/applications/new" className="add-button">
                + Add New Application
              </Link>
              <Link to="/applications/import" className="import-button">
                Import from CSV
              </Link>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
