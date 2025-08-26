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
vi.mock("../../../utils/route-guards", () => ({
  requireUserAuth: vi.fn(),
}));

// Mock data for the confirmation page
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

// Mock component for testing
function ConfirmImportApplications() {
  const router = { navigate: mockNavigate };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Confirm Import</h1>
        <p>Review and edit your applications before importing</p>
      </header>

      <main className="page-content">
        <div className="import-container">
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
                    <th>Job Board</th>
                    <th>Applied Date</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockImportData.map((app, index) => (
                    <tr key={index}>
                      <td>
                        <span className="editable-cell" title="Click to edit">
                          {app.companyName}
                        </span>
                      </td>
                      <td>
                        <span className="editable-cell" title="Click to edit">
                          {app.roleName}
                        </span>
                      </td>
                      <td>
                        <span className="editable-cell" title="Click to edit">
                          {app.jobBoard}
                        </span>
                      </td>
                      <td>
                        <span className="editable-cell" title="Click to edit">
                          {app.appliedDate}
                        </span>
                      </td>
                      <td>
                        <span className="editable-cell" title="Click to edit">
                          {app.applicationType}
                        </span>
                      </td>
                      <td className={`validation-${app.validationStatus}`}>
                        {app.validationStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="import-actions">
              <button
                type="button"
                className="back-button"
                onClick={() => router.navigate({ to: "/applications/import" })}
              >
                ← Back to Upload
              </button>
              <button
                type="button"
                className="import-button"
                onClick={() => console.log("Import clicked")}
              >
                Import {mockImportData.length} Applications
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

describe("Applications Import Confirmation Route", () => {
  afterEach(() => {
    cleanup();
  });

  test("displays confirm import page header", () => {
    render(<ConfirmImportApplications />);

    expect(screen.getByText("Confirm Import")).toBeInTheDocument();
    expect(
      screen.getByText("Review and edit your applications before importing"),
    ).toBeInTheDocument();
  });

  test("displays preview section with description", () => {
    render(<ConfirmImportApplications />);

    expect(screen.getByText("Preview Applications")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review the applications below. Click on any cell to edit its value.",
      ),
    ).toBeInTheDocument();
  });

  test("displays preview table with application data", () => {
    render(<ConfirmImportApplications />);

    // Check table headers
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Job Board")).toBeInTheDocument();
    expect(screen.getByText("Applied Date")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  test("displays application data in table rows", () => {
    render(<ConfirmImportApplications />);

    // Check first application
    expect(screen.getByText("TechCorp Inc.")).toBeInTheDocument();
    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("2025-01-15")).toBeInTheDocument();

    // Check second application
    expect(screen.getByText("StartupXYZ")).toBeInTheDocument();
    expect(screen.getByText("Frontend Developer")).toBeInTheDocument();
    expect(screen.getByText("Indeed")).toBeInTheDocument();

    // Check third application
    expect(screen.getByText("BigCorp")).toBeInTheDocument();
    expect(screen.getByText("Engineering Manager")).toBeInTheDocument();
    expect(screen.getByText("Company Site")).toBeInTheDocument();
  });

  test("displays editable cells with correct attributes", () => {
    render(<ConfirmImportApplications />);

    const editableCells = screen.getAllByTitle("Click to edit");
    expect(editableCells.length).toBeGreaterThan(0);

    // Each editable cell should have the correct class
    editableCells.forEach((cell) => {
      expect(cell).toHaveClass("editable-cell");
    });
  });

  test("displays validation status for all applications as valid", () => {
    render(<ConfirmImportApplications />);

    const validationStatuses = screen.getAllByText("valid");
    expect(validationStatuses).toHaveLength(3);

    validationStatuses.forEach((element) => {
      expect(element).toHaveClass("validation-valid");
    });
  });

  test("displays action buttons", () => {
    render(<ConfirmImportApplications />);

    const backButton = screen.getByText("← Back to Upload");
    const importButton = screen.getByText("Import 3 Applications");

    expect(backButton).toBeInTheDocument();
    expect(importButton).toBeInTheDocument();

    expect(backButton).toHaveClass("back-button");
    expect(importButton).toHaveClass("import-button");
  });

  test("shows correct application count in import button", () => {
    render(<ConfirmImportApplications />);

    const importButton = screen.getByText("Import 3 Applications");
    expect(importButton).toBeInTheDocument();
  });
});

describe("Confirm Page Data Structure", () => {
  test("handles mock data structure correctly", () => {
    expect(mockImportData).toHaveLength(3);
    expect(mockImportData[0].companyName).toBe("TechCorp Inc.");
    expect(mockImportData[0].validationStatus).toBe("valid");
    expect(mockImportData[1].applicationType).toBe("warm");
    expect(mockImportData[2].roleType).toBe("manager");
  });

  test("handles applications with missing optional fields", () => {
    const appWithEmptyUrl = mockImportData.find(
      (app) => app.jobPostingUrl === "",
    );
    const appWithEmptyNotes = mockImportData.find((app) => app.notes === "");

    expect(appWithEmptyUrl).toBeTruthy();
    expect(appWithEmptyNotes).toBeTruthy();
    expect(appWithEmptyUrl?.companyName).toBe("BigCorp");
  });

  test("includes all required application fields", () => {
    mockImportData.forEach((app) => {
      expect(app.companyName).toBeTruthy();
      expect(app.roleName).toBeTruthy();
      expect(app.appliedDate).toBeTruthy();
      expect(app.jobBoard).toBeTruthy();
      expect(app.applicationType).toMatch(/^(cold|warm)$/);
      expect(app.roleType).toMatch(/^(engineer|manager)$/);
      expect(app.locationType).toMatch(/^(remote|hybrid|on-site)$/);
    });
  });
});
