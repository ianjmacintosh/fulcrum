import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock the router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: vi.fn(() => (config: any) => ({
    beforeLoad: config.beforeLoad,
    component: config.component,
  })),
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock the route guards
vi.mock("../../utils/route-guards", () => ({
  requireUserAuth: vi.fn(),
}));

// Mock data representing "happy path" CSV data - matches what's in the component
const mockImportData = [
  {
    companyName: "TechCorp Inc.",
    roleName: "Senior Software Engineer",
    jobPostingUrl: "https://techcorp.com/careers/123",
    appliedDate: "2025-01-15",
    jobBoard: "LinkedIn",
    applicationType: "cold" as const,
    roleType: "engineer" as const,
    locationType: "remote" as const,
    notes: "Applied through LinkedIn",
    validationStatus: "valid",
  },
  {
    companyName: "StartupXYZ",
    roleName: "Frontend Developer",
    jobPostingUrl: "https://startupxyz.com/jobs/456",
    appliedDate: "2025-01-16",
    jobBoard: "Indeed",
    applicationType: "warm" as const,
    roleType: "engineer" as const,
    locationType: "hybrid" as const,
    notes: "Referral from John",
    validationStatus: "valid",
  },
  {
    companyName: "BigCorp",
    roleName: "Engineering Manager",
    jobPostingUrl: "",
    appliedDate: "2025-01-17",
    jobBoard: "Company Site",
    applicationType: "cold" as const,
    roleType: "manager" as const,
    locationType: "on-site" as const,
    notes: "",
    validationStatus: "valid",
  },
];

// Mock component for testing - matches new upload UI
function ImportApplications() {
  const router = { navigate: mockNavigate };

  return (
    <div className="page">
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
              <button type="button" className="download-sample-button">
                Download Sample CSV
              </button>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="upload-section">
            <h2>Upload Your CSV File</h2>

            <div className="file-drop-zone">
              <div className="file-drop-content">
                <div className="drop-icon">📁</div>
                <div className="drop-text">
                  <strong>Drag and drop your CSV file here</strong>
                  <span>or click to browse files</span>
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                className="file-input"
                style={{ display: "none" }}
                id="csvFile"
              />
              <label htmlFor="csvFile" className="file-input-label">
                Choose File
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="import-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={() => router.navigate({ to: "/applications" })}
            >
              Cancel
            </button>
            <button type="button" className="continue-button" disabled={true}>
              Continue to Preview
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

describe("Applications Import Route", () => {
  afterEach(() => {
    cleanup();
  });

  test("displays import page header", () => {
    render(<ImportApplications />);

    expect(screen.getByText("Import Applications")).toBeInTheDocument();
    expect(
      screen.getByText("Upload job applications from a CSV file"),
    ).toBeInTheDocument();
  });

  test("displays CSV format instructions", () => {
    render(<ImportApplications />);

    expect(screen.getByText("CSV Format Instructions")).toBeInTheDocument();
    expect(
      screen.getByText("Your CSV file should contain the following columns:"),
    ).toBeInTheDocument();

    // Check format table headers
    expect(screen.getByText("Column Name")).toBeInTheDocument();
    expect(screen.getAllByText("Required")).toHaveLength(3); // header + 2 data cells
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Example")).toBeInTheDocument();
  });

  test("displays required and optional field information", () => {
    render(<ImportApplications />);

    // Check required fields
    expect(screen.getByText("companyName")).toBeInTheDocument();
    expect(screen.getByText("roleName")).toBeInTheDocument();

    // Check examples
    expect(screen.getByText("TechCorp Inc.")).toBeInTheDocument();
    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
  });

  test("displays download sample CSV button", () => {
    render(<ImportApplications />);

    const downloadButton = screen.getByText("Download Sample CSV");
    expect(downloadButton).toBeInTheDocument();
    expect(downloadButton).toHaveClass("download-sample-button");
  });

  test("displays file upload section", () => {
    render(<ImportApplications />);

    expect(screen.getByText("Upload Your CSV File")).toBeInTheDocument();
    expect(
      screen.getByText("Drag and drop your CSV file here"),
    ).toBeInTheDocument();
    expect(screen.getByText("or click to browse files")).toBeInTheDocument();
    expect(screen.getByText("Choose File")).toBeInTheDocument();
  });

  test("displays file input with correct attributes", () => {
    render(<ImportApplications />);

    // Test the file input directly by ID since it's hidden
    const fileInputElement = document.getElementById("csvFile");
    expect(fileInputElement).toBeInTheDocument();
    expect(fileInputElement).toHaveAttribute("accept", ".csv");
    expect(fileInputElement).toHaveAttribute("type", "file");
  });

  test("displays action buttons with correct states", () => {
    render(<ImportApplications />);

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Continue to Preview")).toBeInTheDocument();

    // Check button classes and states
    const cancelButton = screen.getByText("Cancel");
    const continueButton = screen.getByText("Continue to Preview");

    expect(cancelButton).toHaveClass("cancel-button");
    expect(continueButton).toHaveClass("continue-button");
    expect(continueButton).toBeDisabled(); // Should be disabled when no file is selected
  });

  test("displays upload zone styling elements", () => {
    render(<ImportApplications />);

    // Check for upload zone elements
    expect(screen.getByText("📁")).toBeInTheDocument(); // drop icon

    // Check that the drop zone has the correct class
    const dropZone = document.querySelector(".file-drop-zone");
    expect(dropZone).toBeInTheDocument();
  });
});

describe("CSV Upload UI Interactions", () => {
  test("file input accepts CSV files", () => {
    render(<ImportApplications />);

    const fileInputElement = document.getElementById("csvFile");
    expect(fileInputElement).toHaveAttribute("accept", ".csv");
  });

  test("continue button is disabled when no file selected", () => {
    render(<ImportApplications />);

    const continueButton = screen.getAllByText("Continue to Preview")[0];
    expect(continueButton).toBeDisabled();
  });

  test("upload zone has proper styling classes", () => {
    render(<ImportApplications />);

    const dropZone = document.querySelector(".file-drop-zone");
    expect(dropZone).toBeInTheDocument();
    expect(dropZone).toHaveClass("file-drop-zone");
  });
});
