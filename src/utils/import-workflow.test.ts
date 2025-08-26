import { describe, test, expect } from "vitest";
import {
  filterImportableApplications,
  transformToAPIFormat,
  createImportFormData,
  calculateImportSummary,
  ImportApplication,
  APIApplicationData,
} from "./import-workflow";

describe("Import Workflow Logic", () => {
  const mockImportData: ImportApplication[] = [
    {
      companyName: "TechCorp",
      roleName: "Software Engineer",
      validationStatus: "valid",
      shouldImport: true,
    },
    {
      companyName: "StartupXYZ",
      roleName: "Frontend Dev",
      validationStatus: "valid",
      shouldImport: false, // User unchecked this
    },
    {
      companyName: "", // Missing company name
      roleName: "Backend Dev",
      validationStatus: "error",
      shouldImport: false, // Automatically unchecked due to error
    },
    {
      companyName: "BigCorp",
      roleName: "", // Missing role
      validationStatus: "error",
      shouldImport: false, // Automatically unchecked due to error
    },
    {
      companyName: "ValidCorp",
      roleName: "Manager",
      validationStatus: "valid",
      shouldImport: true,
    },
  ];

  describe("filterImportableApplications", () => {
    test("should only return applications marked for import", () => {
      const result = filterImportableApplications(mockImportData);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        companyName: "TechCorp",
        roleName: "Software Engineer",
        shouldImport: true,
      });
      expect(result[1]).toMatchObject({
        companyName: "ValidCorp",
        roleName: "Manager",
        shouldImport: true,
      });
    });

    test("should return empty array when no applications are marked for import", () => {
      const noImportData: ImportApplication[] = [
        {
          companyName: "TechCorp",
          roleName: "Engineer",
          validationStatus: "valid",
          shouldImport: false,
        },
      ];

      const result = filterImportableApplications(noImportData);
      expect(result).toHaveLength(0);
    });

    test("should handle empty input", () => {
      const result = filterImportableApplications([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("transformToAPIFormat", () => {
    test("should transform import data to API format with defaults", () => {
      const inputData: ImportApplication[] = [
        {
          companyName: "TechCorp",
          roleName: "Software Engineer",
          validationStatus: "valid",
          shouldImport: true,
        },
      ];

      const result = transformToAPIFormat(inputData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        companyName: "TechCorp",
        roleName: "Software Engineer",
        jobPostingUrl: "",
        appliedDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), // Today's date
        jobBoard: "Unknown",
        applicationType: "cold",
        roleType: "engineer",
        locationType: "remote",
        notes: "",
      });
    });

    test("should preserve company name and role name exactly", () => {
      const inputData: ImportApplication[] = [
        {
          companyName: "Big Corp, LLC",
          roleName: "Senior Software Engineer III",
          validationStatus: "valid",
          shouldImport: true,
        },
      ];

      const result = transformToAPIFormat(inputData);

      expect(result[0].companyName).toBe("Big Corp, LLC");
      expect(result[0].roleName).toBe("Senior Software Engineer III");
    });

    test("should handle empty input", () => {
      const result = transformToAPIFormat([]);
      expect(result).toHaveLength(0);
    });

    test("should set today's date as applied date", () => {
      const inputData: ImportApplication[] = [
        {
          companyName: "TechCorp",
          roleName: "Engineer",
          validationStatus: "valid",
          shouldImport: true,
        },
      ];

      const result = transformToAPIFormat(inputData);
      const today = new Date().toISOString().split("T")[0];

      expect(result[0].appliedDate).toBe(today);
    });
  });

  describe("createImportFormData", () => {
    test("should create FormData with applications and CSRF tokens", () => {
      const applications: APIApplicationData[] = [
        {
          companyName: "TechCorp",
          roleName: "Engineer",
          jobPostingUrl: "",
          appliedDate: "2025-01-15",
          jobBoard: "Unknown",
          applicationType: "cold",
          roleType: "engineer",
          locationType: "remote",
          notes: "",
        },
      ];

      const formData = createImportFormData(applications, "csrf123", "hash456");

      expect(formData.get("applications")).toBe(JSON.stringify(applications));
      expect(formData.get("csrf_token")).toBe("csrf123");
      expect(formData.get("csrf_hash")).toBe("hash456");
    });

    test("should handle empty applications array", () => {
      const formData = createImportFormData([], "csrf123", "hash456");

      expect(formData.get("applications")).toBe("[]");
      expect(formData.get("csrf_token")).toBe("csrf123");
      expect(formData.get("csrf_hash")).toBe("hash456");
    });
  });

  describe("calculateImportSummary", () => {
    test("should calculate correct summary statistics", () => {
      const summary = calculateImportSummary(mockImportData);

      expect(summary).toEqual({
        total: 5,
        valid: 3, // TechCorp, StartupXYZ, ValidCorp
        invalid: 2, // Missing company name, Missing role
        selected: 2, // TechCorp, ValidCorp (only ones with shouldImport: true)
      });
    });

    test("should handle all valid applications", () => {
      const allValidData: ImportApplication[] = [
        {
          companyName: "TechCorp",
          roleName: "Engineer",
          validationStatus: "valid",
          shouldImport: true,
        },
        {
          companyName: "StartupXYZ",
          roleName: "Developer",
          validationStatus: "valid",
          shouldImport: true,
        },
      ];

      const summary = calculateImportSummary(allValidData);

      expect(summary).toEqual({
        total: 2,
        valid: 2,
        invalid: 0,
        selected: 2,
      });
    });

    test("should handle all invalid applications", () => {
      const allInvalidData: ImportApplication[] = [
        {
          companyName: "",
          roleName: "Engineer",
          validationStatus: "error",
          shouldImport: false,
        },
        {
          companyName: "TechCorp",
          roleName: "",
          validationStatus: "error",
          shouldImport: false,
        },
      ];

      const summary = calculateImportSummary(allInvalidData);

      expect(summary).toEqual({
        total: 2,
        valid: 0,
        invalid: 2,
        selected: 0,
      });
    });

    test("should handle empty input", () => {
      const summary = calculateImportSummary([]);

      expect(summary).toEqual({
        total: 0,
        valid: 0,
        invalid: 0,
        selected: 0,
      });
    });
  });

  describe("integration tests", () => {
    test("should handle complete import workflow", () => {
      // 1. Calculate summary
      const summary = calculateImportSummary(mockImportData);
      expect(summary.selected).toBe(2);

      // 2. Filter importable applications
      const importableApps = filterImportableApplications(mockImportData);
      expect(importableApps).toHaveLength(summary.selected);

      // 3. Transform to API format
      const apiData = transformToAPIFormat(importableApps);
      expect(apiData).toHaveLength(summary.selected);

      // 4. Create form data
      const formData = createImportFormData(apiData, "csrf123", "hash456");
      expect(formData.get("csrf_token")).toBe("csrf123");

      // Verify the applications data
      const applicationsData = JSON.parse(
        formData.get("applications") as string,
      );
      expect(applicationsData).toHaveLength(2);
      expect(applicationsData[0].companyName).toBe("TechCorp");
      expect(applicationsData[1].companyName).toBe("ValidCorp");
    });
  });
});
