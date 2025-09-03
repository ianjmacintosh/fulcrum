import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { requireUserAuth } from "../../utils/route-guards";
import { JobApplicationCardsList } from "../../components/JobApplicationCardsList";
import {
  decryptFields,
  createKeyFromPassword,
  isDataEncrypted,
} from "../../services/encryption-service";
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
  const [decryptedApplications, setDecryptedApplications] =
    useState(rawApplications);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [decryptionError, setDecryptionError] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Check if applications need decryption
  useEffect(() => {
    if (rawApplications.length > 0) {
      // Check if any application has encrypted data
      const hasEncryptedData = rawApplications.some((app: any) =>
        isDataEncrypted(app, "JobApplication"),
      );

      if (hasEncryptedData && !needsPassword) {
        setNeedsPassword(true);
      } else if (!hasEncryptedData) {
        setDecryptedApplications(rawApplications);
      }
    }
  }, [rawApplications, needsPassword]);

  const handleDecryption = async () => {
    if (!password) {
      setDecryptionError(
        "Please enter your password to decrypt application data.",
      );
      return;
    }

    setIsDecrypting(true);
    setDecryptionError("");

    try {
      // Create decryption key from password
      const { key } = await createKeyFromPassword(password);

      // Decrypt all applications
      const decryptedApps = await Promise.all(
        rawApplications.map(async (app: any) => {
          try {
            return await decryptFields(app, key, "JobApplication");
          } catch (error) {
            console.warn(`Failed to decrypt application ${app._id}:`, error);
            // Return original app if decryption fails (backward compatibility)
            return app;
          }
        }),
      );

      setDecryptedApplications(decryptedApps);
      setNeedsPassword(false);
      setPassword(""); // Clear password from memory
    } catch (error) {
      console.error("Decryption failed:", error);
      setDecryptionError(
        "Failed to decrypt application data. Please check your password.",
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Applications</h1>
        <p>
          Track all applications and update job status throughout the process
        </p>
      </header>

      <main className="page-content">
        {needsPassword && (
          <section className="decryption-prompt">
            <h2>Decrypt Your Application Data</h2>
            <p>
              Your application data is encrypted. Please enter your password to
              decrypt and view your applications.
            </p>

            <div className="decryption-form">
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleDecryption();
                  }
                }}
                disabled={isDecrypting}
              />
              <button
                onClick={handleDecryption}
                disabled={isDecrypting || !password}
                className="decrypt-button"
              >
                {isDecrypting ? "Decrypting..." : "Decrypt Data"}
              </button>
            </div>

            {decryptionError && (
              <div className="error-message">{decryptionError}</div>
            )}
          </section>
        )}

        {!needsPassword && (
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
        )}
      </main>
    </div>
  );
}
