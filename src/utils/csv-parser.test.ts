import { describe, test, expect } from "vitest";
import { parseJobApplicationsCSV } from "./csv-parser";

describe("parseJobApplicationsCSV", () => {
  describe("basic functionality", () => {
    test("should parse valid CSV with two columns", () => {
      const csvText = `Company,Job Title
TechCorp,Software Engineer
StartupXYZ,Frontend Developer`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        companyName: "TechCorp",
        roleName: "Software Engineer",
        validationStatus: "valid",
      });
      expect(result[1]).toEqual({
        companyName: "StartupXYZ",
        roleName: "Frontend Developer",
        validationStatus: "valid",
      });
    });

    test("should parse CSV with different header names (position-based)", () => {
      const csvText = `Organization,Position
BigCorp,Manager
SmallCorp,Developer`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        companyName: "BigCorp",
        roleName: "Manager",
        validationStatus: "valid",
      });
      expect(result[1]).toEqual({
        companyName: "SmallCorp",
        roleName: "Developer",
        validationStatus: "valid",
      });
    });
  });

  describe("validation handling", () => {
    test("should mark rows with missing company name as error", () => {
      const csvText = `Company,Job Title
TechCorp,Software Engineer
,Missing Company`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        companyName: "TechCorp",
        roleName: "Software Engineer",
        validationStatus: "valid",
      });
      expect(result[1]).toEqual({
        companyName: "",
        roleName: "Missing Company",
        validationStatus: "error",
      });
    });

    test("should mark rows with missing job title as error", () => {
      const csvText = `Company,Job Title
TechCorp,Software Engineer
MissingTitle,`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        companyName: "TechCorp",
        roleName: "Software Engineer",
        validationStatus: "valid",
      });
      expect(result[1]).toEqual({
        companyName: "MissingTitle",
        roleName: "",
        validationStatus: "error",
      });
    });

    test("should mark rows with both missing fields as error", () => {
      const csvText = `Company,Job Title
TechCorp,Software Engineer
,`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        companyName: "TechCorp",
        roleName: "Software Engineer",
        validationStatus: "valid",
      });
      expect(result[1]).toEqual({
        companyName: "",
        roleName: "",
        validationStatus: "error",
      });
    });
  });

  describe("edge cases", () => {
    test("should throw error for empty CSV", () => {
      expect(() => parseJobApplicationsCSV("")).toThrow(
        "CSV file must have a header row and at least one data row",
      );
    });

    test("should throw error for CSV with only header", () => {
      const csvText = `Company,Job Title`;

      expect(() => parseJobApplicationsCSV(csvText)).toThrow(
        "CSV file must have a header row and at least one data row",
      );
    });

    test("should throw error for CSV with only whitespace", () => {
      expect(() => parseJobApplicationsCSV("   \n  \n  ")).toThrow(
        "CSV file must have a header row and at least one data row",
      );
    });

    test("should skip completely empty lines", () => {
      const csvText = `Company,Job Title
TechCorp,Software Engineer

StartupXYZ,Frontend Developer
`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0].companyName).toBe("TechCorp");
      expect(result[1].companyName).toBe("StartupXYZ");
    });

    test("should handle CSV with trailing whitespace", () => {
      const csvText = `Company,Job Title
  TechCorp  ,  Software Engineer  
StartupXYZ,Frontend Developer`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        companyName: "TechCorp",
        roleName: "Software Engineer",
        validationStatus: "valid",
      });
    });

    test("should handle CSV with quoted values", () => {
      const csvText = `Company,Job Title
"TechCorp Inc.","Software Engineer"
"Big Corp, LLC","Senior Developer"`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        companyName: "TechCorp Inc.",
        roleName: "Software Engineer",
        validationStatus: "valid",
      });
      expect(result[1]).toEqual({
        companyName: "Big Corp, LLC",
        roleName: "Senior Developer",
        validationStatus: "valid",
      });
    });

    test("should handle CSV with special characters", () => {
      const csvText = `Company,Job Title
Café & Co,UX/UI Designer
Tech@Scale,Node.js Developer`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        companyName: "Café & Co",
        roleName: "UX/UI Designer",
        validationStatus: "valid",
      });
      expect(result[1]).toEqual({
        companyName: "Tech@Scale",
        roleName: "Node.js Developer",
        validationStatus: "valid",
      });
    });

    test("should handle single row CSV", () => {
      const csvText = `Company,Job Title
OnlyCorp,Only Role`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        companyName: "OnlyCorp",
        roleName: "Only Role",
        validationStatus: "valid",
      });
    });

    test("should handle CSV with extra columns", () => {
      const csvText = `Company,Job Title,Extra Column,Another
TechCorp,Software Engineer,Extra Data,More Data
StartupXYZ,Frontend Developer,Ignored,Also Ignored`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        companyName: "TechCorp",
        roleName: "Software Engineer",
        validationStatus: "valid",
      });
      expect(result[1]).toEqual({
        companyName: "StartupXYZ",
        roleName: "Frontend Developer",
        validationStatus: "valid",
      });
    });

    test("should handle CSV with missing columns (only first column)", () => {
      const csvText = `Company
TechCorp
StartupXYZ`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        companyName: "TechCorp",
        roleName: "",
        validationStatus: "error",
      });
      expect(result[1]).toEqual({
        companyName: "StartupXYZ",
        roleName: "",
        validationStatus: "error",
      });
    });
  });

  describe("malformed CSV handling", () => {
    test("should handle CSV with inconsistent column counts", () => {
      const csvText = `Company,Job Title
TechCorp,Software Engineer
StartupXYZ`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        companyName: "TechCorp",
        roleName: "Software Engineer",
        validationStatus: "valid",
      });
      expect(result[1]).toEqual({
        companyName: "StartupXYZ",
        roleName: "",
        validationStatus: "error",
      });
    });

    test("should handle very long field values", () => {
      const longCompanyName = "A".repeat(1000);
      const longRoleName = "B".repeat(1000);
      const csvText = `Company,Job Title
${longCompanyName},${longRoleName}`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        companyName: longCompanyName,
        roleName: longRoleName,
        validationStatus: "valid",
      });
    });

    test("should handle CSV with null bytes and control characters", () => {
      const csvText = `Company,Job Title\nTech\\u0000Corp,Software\\tEngineer`;

      const result = parseJobApplicationsCSV(csvText);

      expect(result).toHaveLength(1);
      // The null byte and tab should be preserved as-is
      expect(result[0].companyName).toContain("Tech");
      expect(result[0].roleName).toContain("Software");
    });
  });
});
