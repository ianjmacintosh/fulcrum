import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import JobApplicationsCSVUpload from "./JobApplicationsCSVUpload";
import { parseJobApplicationsCSV } from "../utils/csv-parser";

describe("JobApplicationsCSVUpload", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders CSV file upload input", () => {
    const mockOnFileSelect = vi.fn();
    render(<JobApplicationsCSVUpload onFileSelect={mockOnFileSelect} />);

    expect(screen.getByLabelText("Choose CSV file")).toBeInTheDocument();
    expect(screen.getByText("Choose CSV file")).toBeInTheDocument();
  });

  it("shows selected file information", () => {
    const mockOnFileSelect = vi.fn();
    const mockFile = new File(["content"], "applications.csv", {
      type: "text/csv",
    });
    Object.defineProperty(mockFile, "size", { value: 1024 });

    render(
      <JobApplicationsCSVUpload
        onFileSelect={mockOnFileSelect}
        selectedFile={mockFile}
      />,
    );

    expect(screen.getByText("applications.csv")).toBeInTheDocument();
    expect(screen.getByText("(1.0 KB)")).toBeInTheDocument();
    expect(screen.getByText("Remove")).toBeInTheDocument();
  });
});

describe("CSV Parsing with actual parsing function", () => {
  it("works with natural column headers (problem now fixed)", () => {
    // This now works with our position-based parsing
    const csvWithNaturalHeaders = `Company,Job Title
TechCorp Inc.,Senior Software Engineer
StartupXYZ,Frontend Developer`;

    const result = parseJobApplicationsCSV(csvWithNaturalHeaders);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      companyName: "TechCorp Inc.",
      roleName: "Senior Software Engineer",
      validationStatus: "valid",
    });
    expect(result[1]).toEqual({
      companyName: "StartupXYZ",
      roleName: "Frontend Developer",
      validationStatus: "valid",
    });
  });

  it("works with any headers in first two columns", () => {
    // Position-based parsing works with any headers
    const csvWithAnyHeaders = `Organization,Position Title
TechCorp Inc.,Senior Software Engineer
StartupXYZ,Frontend Developer`;

    const result = parseJobApplicationsCSV(csvWithAnyHeaders);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      companyName: "TechCorp Inc.",
      roleName: "Senior Software Engineer",
      validationStatus: "valid",
    });
  });

  it("imports rows with missing data but marks them as invalid", () => {
    const csvWithMissingData = `Company,Job Title
TechCorp Inc.,Senior Software Engineer
,Frontend Developer
ValidCorp,`;

    const result = parseJobApplicationsCSV(csvWithMissingData);

    expect(result).toHaveLength(3);

    // Valid row
    expect(result[0]).toEqual({
      companyName: "TechCorp Inc.",
      roleName: "Senior Software Engineer",
      validationStatus: "valid",
    });

    // Invalid row - missing company
    expect(result[1]).toEqual({
      companyName: "",
      roleName: "Frontend Developer",
      validationStatus: "error",
    });

    // Invalid row - missing job title
    expect(result[2]).toEqual({
      companyName: "ValidCorp",
      roleName: "",
      validationStatus: "error",
    });
  });
});
