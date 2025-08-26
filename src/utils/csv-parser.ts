export interface ParsedJobApplication {
  companyName: string;
  roleName: string;
  validationStatus: "valid" | "error";
}

export function parseJobApplicationsCSV(
  csvText: string,
): ParsedJobApplication[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    throw new Error(
      "CSV file must have a header row and at least one data row",
    );
  }

  const data: ParsedJobApplication[] = [];

  // Skip header row (line 0) and parse data rows starting from line 1
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip completely empty lines
    if (!line) {
      continue;
    }

    const values = line.split(",").map((val) => val.trim().replace(/"/g, ""));

    // Position-based parsing: first column = company, second column = role
    const companyName = (values[0] || "").trim();
    const roleName = (values[1] || "").trim();

    // Determine validation status - invalid if either field is empty
    const validationStatus = companyName && roleName ? "valid" : "error";

    // Add parsed row with actual data (including empty strings)
    data.push({
      companyName,
      roleName,
      validationStatus,
    });
  }

  return data;
}
