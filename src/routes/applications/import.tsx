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
              {/* File Upload Section */}
              <div className="upload-section">
                <h2>Upload Your CSV File</h2>
                <p className="upload-instructions">
                  Upload your CSV of companies and jobs. Make sure the first
                  column stores the company name and the second column stores
                  the job title. After submitting it, the next page will give
                  you a chance to review the data before it&apos;s added to your
                  account.
                </p>
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
