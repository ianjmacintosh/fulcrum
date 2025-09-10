import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { requireUserAuth } from "../../utils/route-guards";
import { JobApplicationCardsList } from "../../components/JobApplicationCardsList";
import {
  decryptFields,
  isDataEncrypted,
} from "../../services/encryption-service";
import { useAuth } from "../../hooks/useAuth";
import "./index.css";

export const Route = createFileRoute("/applications/")({
  beforeLoad: requireUserAuth,
  loader: async () => {
    // On server-side, skip loading data if user is not authenticated
    // Client will reload once auth context is available
    if (typeof window === "undefined") {
      return { applications: [] };
    }

    try {
      const response = await fetch("/api/applications/", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error("Applications API returned error");
      }

      return { applications: result.applications };
    } catch (error) {
      console.error("Applications loader error:", error);
      throw error;
    }
  },
  component: Applications,
});

function Applications() {
  const { applications: rawApplications } = Route.useLoaderData();
  const { encryptionKey } = useAuth();
  const [decryptedApplications, setDecryptedApplications] =
    useState(rawApplications);
  const [decryptionError, setDecryptionError] = useState("");

  // Decrypt applications when data or encryption key changes
  useEffect(() => {
    const decryptApplications = async () => {
      if (rawApplications.length === 0) {
        setDecryptedApplications(rawApplications);
        return;
      }

      // Check if any application has encrypted data
      const hasEncryptedData = rawApplications.some((app: any) =>
        isDataEncrypted(app, "JobApplication"),
      );

      if (!hasEncryptedData) {
        // No encrypted data, use applications as-is
        setDecryptedApplications(rawApplications);
        return;
      }

      if (!encryptionKey) {
        // Need encryption key but don't have it
        setDecryptionError(
          "Encryption key not available. Please log out and log back in to decrypt your data.",
        );
        setDecryptedApplications(rawApplications); // Show encrypted data as fallback
        return;
      }

      try {
        // Decrypt all applications
        const decryptedApps = await Promise.all(
          rawApplications.map(async (app: any) => {
            try {
              return await decryptFields(app, encryptionKey, "JobApplication");
            } catch (error) {
              console.warn(`Failed to decrypt application ${app._id}:`, error);
              // Return original app if decryption fails (backward compatibility)
              return app;
            }
          }),
        );

        setDecryptedApplications(decryptedApps);
        setDecryptionError("");
      } catch (error) {
        console.error("Decryption failed:", error);
        setDecryptionError("Failed to decrypt application data.");
        setDecryptedApplications(rawApplications); // Show encrypted data as fallback
      }
    };

    decryptApplications();
  }, [rawApplications, encryptionKey]);

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

        {
          <>
            <section className="applications-summary">
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="summary-label">Total Applications</span>
                  <span className="summary-value">
                    {decryptedApplications.length}
                  </span>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Open Applications</span>
                  <span className="summary-value">
                    {
                      decryptedApplications.filter(
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
                      decryptedApplications.filter((app: any) =>
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

            <JobApplicationCardsList applications={decryptedApplications} />

            <section className="add-application">
              <Link to="/applications/new" className="add-button">
                + Add New Application
              </Link>
              <Link to="/applications/import" className="import-button">
                Import from CSV
              </Link>
            </section>
          </>
        }
      </main>
    </div>
  );
}
