import React, { useState } from "react";
import {
  createFileRoute,
  useRouter,
  Outlet,
  useMatches,
} from "@tanstack/react-router";
import { requireUserAuth } from "../../utils/route-guards";
import "./import.css";

export const Route = createFileRoute("/applications/import")({
  beforeLoad: requireUserAuth,
  component: ImportApplications,
});

function ImportApplications() {
  const router = useRouter();
  const matches = useMatches();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Check if a child route is active (like /confirm)
  const hasActiveChildRoute = matches.some(
    (match) =>
      match.routeId !== "/applications/import" &&
      match.fullPath.startsWith("/applications/import/"),
  );

  const handleCancel = () => {
    router.navigate({ to: "/applications" });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file && file.type === "text/csv") {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleContinue = async () => {
    if (selectedFile) {
      try {
        // Parse CSV file
        const csvText = await selectedFile.text();
        const parsedData = parseCSV(csvText);

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

  const parseCSV = (
    csvText: string,
  ): Array<{
    companyName: string;
    roleName: string;
    validationStatus: "valid" | "error";
  }> => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      throw new Error(
        "CSV file must have a header row and at least one data row",
      );
    }

    const header = lines[0]
      .split(",")
      .map((col) => col.trim().replace(/"/g, ""));
    const data: Array<{
      companyName: string;
      roleName: string;
      validationStatus: "valid" | "error";
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]
        .split(",")
        .map((val) => val.trim().replace(/"/g, ""));
      const row: Record<string, string> = {};

      header.forEach((col, index) => {
        row[col] = values[index] || "";
      });

      // Validate required fields
      if (!row.companyName || !row.roleName) {
        throw new Error(
          `Row ${i}: Missing required fields (companyName, roleName)`,
        );
      }

      // Add parsed row with proper typing
      data.push({
        companyName: row.companyName,
        roleName: row.roleName,
        validationStatus: "valid",
      });
    }

    return data;
  };

  const downloadSampleCSV = () => {
    const csvContent = `companyName,roleName
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
                <p>Your CSV file should contain the following columns:</p>

                <div className="format-table-container">
                  <table className="format-table">
                    <thead>
                      <tr>
                        <th>Column Name</th>
                        <th>Required</th>
                        <th>Description</th>
                        <th>Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <code>companyName</code>
                        </td>
                        <td>
                          <span className="required">Required</span>
                        </td>
                        <td>Name of the company</td>
                        <td>TechCorp Inc.</td>
                      </tr>
                      <tr>
                        <td>
                          <code>roleName</code>
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

                <div
                  className={`file-drop-zone ${isDragOver ? "drag-over" : ""} ${selectedFile ? "file-selected" : ""}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {selectedFile ? (
                    <div className="file-selected-content">
                      <div className="file-icon">📄</div>
                      <div className="file-info">
                        <div className="file-name">{selectedFile.name}</div>
                        <div className="file-size">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <button
                        type="button"
                        className="remove-file"
                        onClick={() => setSelectedFile(null)}
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="file-drop-content">
                      <div className="drop-icon">📁</div>
                      <div className="drop-text">
                        <strong>Drag and drop your CSV file here</strong>
                        <span>or click to browse files</span>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="file-input"
                    style={{ display: "none" }}
                    id="csvFile"
                  />
                  {!selectedFile && (
                    <label htmlFor="csvFile" className="file-input-label">
                      Choose File
                    </label>
                  )}
                </div>
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
