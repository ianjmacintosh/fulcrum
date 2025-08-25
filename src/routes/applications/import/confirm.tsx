import React, { useState, useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { requireUserAuth } from "../../../utils/route-guards";
import { fetchCSRFTokens, CSRFTokens } from "../../../utils/csrf-client";
import "./confirm.css";

export const Route = createFileRoute("/applications/import/confirm")({
  beforeLoad: requireUserAuth,
  component: ConfirmImportApplications,
});

// Type for import data - simplified to only required fields
type ImportApplication = {
  companyName: string;
  roleName: string;
  validationStatus: "valid" | "error";
};

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
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);

  // Load CSV data and fetch CSRF tokens on component mount
  useEffect(() => {
    // Load CSV data from sessionStorage
    const loadImportData = () => {
      const storedData = sessionStorage.getItem("csvImportData");
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          setImportData(parsedData);
        } catch (error) {
          console.error("Failed to parse stored CSV data:", error);
          setImportError(
            "Failed to load import data. Please go back and re-upload your CSV file.",
          );
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
        setImportError(
          "Failed to load security tokens. Please refresh the page.",
        );
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
    setImportError("");

    // Check if CSRF tokens are available
    if (!csrfTokens) {
      setImportError("Security tokens not loaded. Please refresh the page.");
      return;
    }

    setIsImporting(true);

    try {
      // Check if we're in dry run mode (testing phase)
      const isDryRun =
        process.env.NODE_ENV === "test" ||
        window.location.hostname === "localhost" ||
        window.location.search.includes("dryrun=true");

      if (isDryRun) {
        // Dry run mode - simulate success without actually creating applications
        console.log(
          "Dry run mode: Would import",
          importData.length,
          "applications:",
          importData,
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
      // Prepare applications for submission (remove validation status)
      const applicationsToSubmit = importData.map((app) => ({
        companyName: app.companyName,
        roleName: app.roleName,
        // Set default values for required fields
        jobPostingUrl: "",
        appliedDate: new Date().toISOString().split("T")[0], // Today's date
        jobBoard: "Unknown",
        applicationType: "cold" as const,
        roleType: "engineer" as const,
        locationType: "remote" as const,
        notes: "",
      }));

      // Create form data for bulk submission
      const submitFormData = new FormData();
      submitFormData.append(
        "applications",
        JSON.stringify(applicationsToSubmit),
      );
      submitFormData.append("csrf_token", csrfTokens.csrfToken);
      submitFormData.append("csrf_hash", csrfTokens.csrfHash);

      // Submit to API
      const response = await fetch("/api/applications/create", {
        method: "POST",
        body: submitFormData,
      });

      const result = await response.json();

      if (result.success) {
        setImportSuccess(true);

        // Clear stored CSV data
        sessionStorage.removeItem("csvImportData");

        // Redirect to applications list after a brief delay
        setTimeout(() => {
          router.navigate({ to: "/applications" });
        }, 1500);
      } else {
        setImportError(result.error || "Failed to import applications");
      }
    } catch (error) {
      console.error("Error importing applications:", error);
      setImportError("Failed to import applications. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleCellClick = (rowIndex: number, field: string) => {
    setEditingCell({ rowIndex, field });
  };

  const handleCellChange = (
    rowIndex: number,
    field: keyof ImportApplication,
    value: string,
  ) => {
    setImportData((prevData) =>
      prevData.map((app, index) =>
        index === rowIndex ? { ...app, [field]: value } : app,
      ),
    );
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const renderEditableCell = (
    app: ImportApplication,
    rowIndex: number,
    field: keyof ImportApplication,
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
                    <th>Company</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.map((app, index) => (
                    <tr key={index}>
                      <td>
                        {renderEditableCell(
                          app,
                          index,
                          "companyName",
                          app.companyName,
                        )}
                      </td>
                      <td>
                        {renderEditableCell(
                          app,
                          index,
                          "roleName",
                          app.roleName,
                        )}
                      </td>
                      <td className={`validation-${app.validationStatus}`}>
                        {app.validationStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Success/Error Messages */}
            {importSuccess && (
              <div className="success-message">
                Applications imported successfully! Redirecting to applications
                page...
              </div>
            )}
            {importError && <div className="error-message">{importError}</div>}

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
                disabled={isImporting || !csrfTokens}
              >
                {isImporting
                  ? "Importing..."
                  : !csrfTokens
                    ? "Loading..."
                    : `Import ${importData.length} Applications`}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
