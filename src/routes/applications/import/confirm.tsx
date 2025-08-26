import React, { useState, useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { requireUserAuth } from "../../../utils/route-guards";
import { fetchCSRFTokens, CSRFTokens } from "../../../utils/csrf-client";
import {
  filterImportableApplications,
  transformToAPIFormat,
  createImportFormData,
  calculateImportSummary,
  ImportApplication,
} from "../../../utils/import-workflow";
import {
  handleImportResponse,
  handleImportError,
  getErrorDisplayMessage,
  isRetryableError,
  requiresRefresh,
  ImportErrorInfo,
} from "../../../utils/import-error-handling";
import "./confirm.css";

export const Route = createFileRoute("/applications/import/confirm")({
  beforeLoad: requireUserAuth,
  component: ConfirmImportApplications,
});

function ConfirmImportApplications() {
  const router = useRouter();
  const [csrfTokens, setCsrfTokens] = useState<CSRFTokens | null>(null);
  const [importData, setImportData] = useState<ImportApplication[]>([]);
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    field: string;
  } | null>(null);

  // Import loading states
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<ImportErrorInfo | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Load CSV data and fetch CSRF tokens on component mount
  useEffect(() => {
    // Load CSV data from sessionStorage
    const loadImportData = () => {
      const storedData = sessionStorage.getItem("csvImportData");
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          // Add shouldImport flag to each item, defaulting to true for valid items and false for errors
          const dataWithImportFlags = parsedData.map((item: any) => ({
            ...item,
            shouldImport: item.validationStatus === "valid",
          }));
          setImportData(dataWithImportFlags);
        } catch (error) {
          console.error("Failed to parse stored CSV data:", error);
          setImportError({
            type: "unknown",
            message:
              "Failed to load import data. Please go back and re-upload your CSV file.",
            details: error,
          });
        }
      } else {
        // No data found - redirect back to import page
        router.navigate({ to: "/applications/import" });
      }
    };

    const loadCsrfTokens = async () => {
      try {
        const tokens = await fetchCSRFTokens();
        setCsrfTokens(tokens);
      } catch (error) {
        console.error("Failed to load CSRF tokens:", error);
        setImportError({
          type: "csrf",
          message: "Failed to load security tokens. Please refresh the page.",
          details: error,
        });
      }
    };

    loadImportData();
    loadCsrfTokens();
  }, [router]);

  const handleBack = () => {
    router.navigate({ to: "/applications/import" });
  };

  const handleImport = async () => {
    // Reset any previous errors
    setImportError(null);

    // Check if CSRF tokens are available
    if (!csrfTokens) {
      setImportError({
        type: "csrf",
        message: "Security tokens not loaded. Please refresh the page.",
      });
      return;
    }

    setIsImporting(true);

    try {
      // Check if dry run mode is explicitly enabled
      // - via URL parameter for manual testing
      // - via testing flag for automated tests
      const isDryRun =
        window.location.search.includes("dryrun=true") ||
        (window as any).__TESTING_DRY_RUN_MODE__;

      if (isDryRun) {
        // Dry run mode - simulate success without actually creating applications
        const selectedApps = filterImportableApplications(importData);
        console.log(
          "Dry run mode: Would import",
          selectedApps.length,
          "applications:",
          selectedApps,
        );

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setImportSuccess(true);

        // Clear stored CSV data
        sessionStorage.removeItem("csvImportData");

        // Redirect to applications list after a brief delay
        setTimeout(() => {
          router.navigate({ to: "/applications" });
        }, 1500);

        return;
      }

      // Production mode - actual API call
      // Prepare applications for submission using utility functions
      const importableApps = filterImportableApplications(importData);
      const applicationsToSubmit = transformToAPIFormat(importableApps);

      // Create form data for bulk submission
      const submitFormData = createImportFormData(
        applicationsToSubmit,
        csrfTokens.csrfToken,
        csrfTokens.csrfHash,
      );

      // Submit to API with proper error handling
      const response = await fetch("/api/applications/create", {
        method: "POST",
        body: submitFormData,
      });

      // Handle response using error handling utilities
      await handleImportResponse(response);

      // Success case
      setImportSuccess(true);

      // Clear stored CSV data
      sessionStorage.removeItem("csvImportData");

      // Redirect to applications list after a brief delay
      setTimeout(() => {
        router.navigate({ to: "/applications" });
      }, 1500);
    } catch (error) {
      console.error("Error importing applications:", error);
      const structuredError = handleImportError(error);
      setImportError(structuredError);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCellClick = (rowIndex: number, field: string) => {
    setEditingCell({ rowIndex, field });
  };

  const handleCellChange = (
    rowIndex: number,
    field: "companyName" | "roleName",
    value: string,
  ) => {
    setImportData((prevData) =>
      prevData.map((app, index) =>
        index === rowIndex ? { ...app, [field]: value } : app,
      ),
    );
  };

  const handleImportToggle = (rowIndex: number) => {
    setImportData((prevData) =>
      prevData.map((app, index) =>
        index === rowIndex ? { ...app, shouldImport: !app.shouldImport } : app,
      ),
    );
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const renderEditableCell = (
    app: ImportApplication,
    rowIndex: number,
    field: "companyName" | "roleName",
    displayValue: string,
  ) => {
    const isEditing =
      editingCell?.rowIndex === rowIndex && editingCell?.field === field;

    if (isEditing) {
      return (
        <input
          type="text"
          value={app[field]}
          onChange={(e) => handleCellChange(rowIndex, field, e.target.value)}
          onBlur={handleCellBlur}
          onKeyDown={(e) => e.key === "Enter" && handleCellBlur()}
          autoFocus
          className="cell-editor"
        />
      );
    }

    return (
      <span
        onClick={() => handleCellClick(rowIndex, field)}
        className="editable-cell"
        title="Click to edit"
      >
        {displayValue}
      </span>
    );
  };

  // Calculate import summary for button states and display
  const summary = calculateImportSummary(importData);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Confirm Import</h1>
        <p>Review and edit your applications before importing</p>
      </header>

      <main className="page-content">
        <div className="import-container">
          {/* Preview table showing parsed data */}
          <div className="preview-section">
            <h2>Preview Applications</h2>
            <p className="preview-description">
              Review the applications below. Click on any cell to edit its
              value.
            </p>

            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th className="import-checkbox-header">Import</th>
                    <th className="row-number-header">#</th>
                    <th className="company-header">Company</th>
                    <th className="role-header">Role</th>
                    <th className="status-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((app, index) => (
                    <tr key={index} className={`row-${app.validationStatus}`}>
                      <td className="import-checkbox-cell">
                        <input
                          type="checkbox"
                          checked={app.shouldImport}
                          onChange={() => handleImportToggle(index)}
                          className="import-checkbox"
                        />
                      </td>
                      <td className="row-number">{index + 1}</td>
                      <td className="company-cell">
                        {renderEditableCell(
                          app,
                          index,
                          "companyName",
                          app.companyName,
                        )}
                      </td>
                      <td className="role-cell">
                        {renderEditableCell(
                          app,
                          index,
                          "roleName",
                          app.roleName,
                        )}
                      </td>
                      <td
                        className={`status-cell validation-${app.validationStatus}`}
                      >
                        {app.validationStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Loading/Success/Error Messages */}
            {isImporting && !importSuccess && !importError && (
              <div className="loading-message">
                <div className="loading-spinner">⏳</div>
                <div className="loading-text">
                  <strong>Importing Applications...</strong>
                  <p>
                    Creating {summary.selected} new applications in your
                    account.
                  </p>
                </div>
              </div>
            )}

            {importSuccess && (
              <div className="success-message">
                <div className="success-icon">✅</div>
                <div className="success-text">
                  <strong>Import Successful!</strong>
                  <p>
                    Successfully imported {summary.selected} of {summary.total}{" "}
                    applications.
                    {summary.invalid > 0 && (
                      <span>
                        {" "}
                        ({summary.invalid} rows were skipped due to validation
                        errors.)
                      </span>
                    )}
                  </p>
                  <p>Redirecting to applications page...</p>
                </div>
              </div>
            )}
            {importError && (
              <div className="error-message">
                <div className="error-icon">❌</div>
                <div className="error-content">
                  <div className="error-text">
                    {getErrorDisplayMessage(importError)}
                  </div>
                  {isRetryableError(importError) && (
                    <div className="error-actions">
                      <button
                        type="button"
                        className="retry-button"
                        onClick={handleImport}
                        disabled={isImporting}
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                  {requiresRefresh(importError) && (
                    <div className="error-actions">
                      <button
                        type="button"
                        className="refresh-button"
                        onClick={() => window.location.reload()}
                      >
                        Refresh Page
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="import-actions">
              <button
                type="button"
                className="back-button"
                onClick={handleBack}
                disabled={isImporting}
              >
                ← Back to Upload
              </button>
              <button
                type="button"
                className="import-button"
                onClick={handleImport}
                disabled={isImporting || !csrfTokens || summary.selected === 0}
              >
                {isImporting
                  ? "Importing..."
                  : !csrfTokens
                    ? "Loading..."
                    : summary.selected === 0
                      ? "No Applications Selected"
                      : `Import ${summary.selected} Applications`}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
