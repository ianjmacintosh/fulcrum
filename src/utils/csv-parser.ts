export interface ParsedJobApplication {
  companyName: string;
  roleName: string;
  validationStatus: "valid" | "error";
}

/**
 * Parses a single CSV line, properly handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      // Handle escaped quotes (double quotes)
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 2; // Skip both quotes
        continue;
      }
      // Toggle quote state
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      // Field separator outside of quotes
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }

    i++;
  }

  // Add the last field
  result.push(current.trim());

  // Remove surrounding quotes from all fields
  return result.map((field) => {
    if (field.startsWith('"') && field.endsWith('"')) {
      return field.slice(1, -1);
    }
    return field;
  });
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

    const values = parseCSVLine(line);

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
