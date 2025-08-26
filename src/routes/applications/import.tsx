import React, { useState } from "react";
import {
  createFileRoute,
  useRouter,
  Outlet,
  useMatches,
} from "@tanstack/react-router";
import { requireUserAuth } from "../../utils/route-guards";
import JobApplicationsCSVUpload from "../../components/JobApplicationsCSVUpload";
import { parseJobApplicationsCSV } from "../../utils/csv-parser";
import "./import.css";

export const Route = createFileRoute("/applications/import")({
  beforeLoad: requireUserAuth,
  component: ImportApplications,
});

function ImportApplications() {
  const router = useRouter();
  const matches = useMatches();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Check if a child route is active (like /confirm)
  const hasActiveChildRoute = matches.some(
    (match) =>
      match.routeId !== "/applications/import" &&
      match.fullPath.startsWith("/applications/import/"),
  );

  const handleCancel = () => {
    router.navigate({ to: "/applications" });
  };

  const handleContinue = async () => {
    if (selectedFile) {
      try {
        // Parse CSV file
        const csvText = await selectedFile.text();
        const parsedData = parseJobApplicationsCSV(csvText);

        // Store parsed data in sessionStorage for the confirmation page
        sessionStorage.setItem("csvImportData", JSON.stringify(parsedData));

        // Navigate to confirmation page
        router.navigate({ to: "/applications/import/confirm" });
      } catch (error) {
        console.error("Error parsing CSV file:", error);
        alert(
          `Error parsing CSV file: ${error instanceof Error ? error.message : "Please check the format and try again."}`,
        );
      }
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `Company,Job Title
TechCorp Inc.,Senior Software Engineer
StartupXYZ,Frontend Developer
BigCorp,Engineering Manager`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-applications.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      {!hasActiveChildRoute && (
        <>
          <header className="page-header">
            <h1>Import Applications</h1>
            <p>Upload job applications from a CSV file</p>
          </header>

          <main className="page-content">
            <div className="import-container">
              {/* CSV Format Instructions */}
              <div className="instructions-section">
                <h2>CSV Format Instructions</h2>
                <p>
                  Your CSV file should have data in the first two columns.{" "}
                  <strong>Column headings don't matter</strong> - we only look
                  at column position:
                </p>

                <div className="format-table-container">
                  <table className="format-table">
                    <thead>
                      <tr>
                        <th>Column Position</th>
                        <th>Required</th>
                        <th>Description</th>
                        <th>Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <code>First column</code>
                        </td>
                        <td>
                          <span className="required">Required</span>
                        </td>
                        <td>Company name</td>
                        <td>TechCorp Inc.</td>
                      </tr>
                      <tr>
                        <td>
                          <code>Second column</code>
                        </td>
                        <td>
                          <span className="required">Required</span>
                        </td>
                        <td>Job title or role</td>
                        <td>Senior Software Engineer</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="sample-download">
                  <button
                    type="button"
                    onClick={downloadSampleCSV}
                    className="download-sample-button"
                  >
                    Download Sample CSV
                  </button>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="upload-section">
                <h2>Upload Your CSV File</h2>
                <JobApplicationsCSVUpload
                  onFileSelect={setSelectedFile}
                  selectedFile={selectedFile}
                  label="Choose CSV file"
                />
              </div>

              {/* Action Buttons */}
              <div className="import-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="continue-button"
                  onClick={handleContinue}
                  disabled={!selectedFile}
                >
                  Continue to Preview
                </button>
              </div>
            </div>
          </main>
        </>
      )}
      <Outlet />
    </div>
  );
}
