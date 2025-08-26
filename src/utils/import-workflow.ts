// Types for import data
export interface ImportApplication {
  companyName: string;
  roleName: string;
  validationStatus: "valid" | "error";
  shouldImport: boolean;
}

export interface APIApplicationData {
  companyName: string;
  roleName: string;
  jobPostingUrl: string;
  appliedDate: string;
  jobBoard: string;
  applicationType: "cold" | "warm";
  roleType: "engineer" | "manager";
  locationType: "on-site" | "hybrid" | "remote";
  notes: string;
}

export interface ImportSummary {
  total: number;
  valid: number;
  invalid: number;
  selected: number;
}

/**
 * Filters import data to only include applications marked for import
 */
export function filterImportableApplications(
  importData: ImportApplication[],
): ImportApplication[] {
  return importData.filter((app) => app.shouldImport);
}

/**
 * Transforms import data to API format with default values
 */
export function transformToAPIFormat(
  importData: ImportApplication[],
): APIApplicationData[] {
  return importData.map((app) => ({
    companyName: app.companyName,
    roleName: app.roleName,
    jobPostingUrl: "",
    appliedDate: new Date().toISOString().split("T")[0], // Today's date
    jobBoard: "Unknown",
    applicationType: "cold" as const,
    roleType: "engineer" as const,
    locationType: "remote" as const,
    notes: "",
  }));
}

/**
 * Creates FormData for submitting applications to the API
 */
export function createImportFormData(
  applications: APIApplicationData[],
  csrfToken: string,
  csrfHash: string,
): FormData {
  const formData = new FormData();
  formData.append("applications", JSON.stringify(applications));
  formData.append("csrf_token", csrfToken);
  formData.append("csrf_hash", csrfHash);
  return formData;
}

/**
 * Calculates summary statistics for import data
 */
export function calculateImportSummary(
  importData: ImportApplication[],
): ImportSummary {
  const total = importData.length;
  const valid = importData.filter(
    (app) => app.validationStatus === "valid",
  ).length;
  const invalid = importData.filter(
    (app) => app.validationStatus === "error",
  ).length;
  const selected = importData.filter((app) => app.shouldImport).length;

  return { total, valid, invalid, selected };
}
