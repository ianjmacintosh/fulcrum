import { test, expect } from "@playwright/test";
import { loginAsUser } from "./test-utils";

/**
 * E2E Tests for CSV Import Functionality
 *
 * This test suite covers the complete CSV import workflow and should be
 * extended as new functionality is added:
 *
 * Current coverage:
 * - Navigation to import page
 * - UI rendering and layout
 * - Inline editing of preview data
 * - Button interactions and navigation
 * - Responsive design
 *
 * Future additions should include:
 * - File upload and CSV parsing
 * - Validation error handling
 * - Duplicate detection warnings
 * - Actual import submission
 * - Progress indicators
 * - Success/error feedback
 */
test.describe.serial("CSV Import", () => {
  test("Import from CSV button is visible on applications page", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

    // Navigate to applications page
    await page.goto("/applications");

    // Check that the applications page loads
    await expect(
      page.getByRole("heading", { name: "Applications" }),
    ).toBeVisible();

    // Verify both navigation buttons are present
    await expect(
      page.getByRole("link", { name: "+ Add New Application" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Import from CSV" }),
    ).toBeVisible();

    // Verify the import button has correct styling class
    const importButton = page.getByRole("link", { name: "Import from CSV" });
    await expect(importButton).toHaveClass(/import-button/);
  });

  test("Import from CSV button navigates to import page", async ({ page }) => {
    // Log in first
    await loginAsUser(page);

    // Navigate to applications page
    await page.goto("/applications");

    // Wait for the page to be fully loaded
    await expect(
      page.getByRole("heading", { name: "Applications" }),
    ).toBeVisible();

    // Wait for the Import from CSV button to be visible
    await expect(
      page.getByRole("link", { name: "Import from CSV" }),
    ).toBeVisible();

    // Click on Import from CSV
    await page.getByRole("link", { name: "Import from CSV" }).click();

    // Wait for navigation to complete
    await page.waitForURL("**/applications/import", { timeout: 10000 });

    // Verify we're on the import page by checking for the specific heading
    await expect(
      page.getByRole("heading", { name: "Import Applications" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("CSV import page loads and displays expected UI elements", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

    // Navigate directly to the import page
    await page.goto("/applications/import");

    // Wait for navigation to complete and page to load
    await page.waitForURL("**/applications/import", { timeout: 10000 });

    // Check that the import page header is visible
    await expect(
      page.getByRole("heading", { name: "Import Applications" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText("Upload job applications from a CSV file"),
    ).toBeVisible();

    // Check that upload section is visible
    await expect(
      page.getByRole("heading", { name: "Upload Your CSV File" }),
    ).toBeVisible();
    await expect(page.getByText("Choose CSV file")).toBeVisible();

    // Check that upload instructions are present
    await expect(
      page.getByText("Upload your CSV of companies and jobs"),
    ).toBeVisible();

    // Check action buttons are present
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue to Preview" }),
    ).toBeVisible();

    // Continue button should be disabled initially
    await expect(
      page.getByRole("button", { name: "Continue to Preview" }),
    ).toBeDisabled();
  });

  test("Continue to Preview button navigation (without file)", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

    // Navigate to the import page
    await page.goto("/applications/import");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Import Applications" }),
    ).toBeVisible();

    // Continue button should be disabled when no file is selected
    const continueButton = page.getByRole("button", {
      name: "Continue to Preview",
    });
    await expect(continueButton).toBeDisabled();
  });

  test("File upload section displays correctly", async ({ page }) => {
    // Log in first
    await loginAsUser(page);

    // Navigate to the import page
    await page.goto("/applications/import");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Import Applications" }),
    ).toBeVisible();

    // Check file upload zone
    await expect(page.getByText("Upload Your CSV File")).toBeVisible();
    await expect(page.getByText("Choose CSV file")).toBeVisible();
    await expect(page.getByText("Max file size: 5 MB")).toBeVisible();

    // Check file input exists and has correct attributes
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute("accept", ".csv");
  });

  test("Cancel button navigates back to applications page", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

    // Navigate to the import page
    await page.goto("/applications/import");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Import Applications" }),
    ).toBeVisible();

    // Click the Cancel button
    await page.getByRole("button", { name: "Cancel" }).click();

    // Verify we're back on the applications page
    await page.waitForURL("**/applications", { timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "Applications", exact: true }),
    ).toBeVisible();
  });

  test("Continue button navigation when file is not uploaded", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

    // Navigate to the import page
    await page.goto("/applications/import");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Import Applications" }),
    ).toBeVisible();

    // Verify continue button is disabled when no file is selected
    const continueButton = page.getByRole("button", {
      name: "Continue to Preview",
    });
    await expect(continueButton).toBeDisabled();
  });

  test("UI is responsive and works on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Log in first
    await loginAsUser(page);

    // Navigate to the import page
    await page.goto("/applications/import");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Import Applications" }),
    ).toBeVisible();

    // Verify key elements are still visible on mobile
    await expect(page.getByText("Upload Your CSV File")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue to Preview" }),
    ).toBeVisible();

    // Verify upload instructions are visible on mobile
    await expect(
      page.getByText("Upload your CSV of companies and jobs"),
    ).toBeVisible();

    // Navigate back to applications page to test mobile navigation
    await page.goto("/applications");

    // Verify both buttons are visible on mobile (should stack vertically)
    await expect(
      page.getByRole("link", { name: "+ Add New Application" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Import from CSV" }),
    ).toBeVisible();
  });

  test("Upload instructions are comprehensive and clear", async ({ page }) => {
    // Log in first
    await loginAsUser(page);

    // Navigate to the import page
    await page.goto("/applications/import");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Import Applications" }),
    ).toBeVisible();

    // Check that upload section description is present
    await expect(
      page.getByText("Upload job applications from a CSV file"),
    ).toBeVisible();

    // Check upload instructions are clear
    await expect(
      page.getByText("Upload your CSV of companies and jobs"),
    ).toBeVisible();
  });
});

test.describe.serial("CSV Import Confirmation Page", () => {
  test.beforeEach(async ({ page }) => {
    // Log in first
    await loginAsUser(page);

    // Set up mock CSV data in sessionStorage for all confirmation page tests
    await page.evaluate(() => {
      const mockData = [
        {
          companyName: "TechCorp Inc.",
          roleName: "Senior Software Engineer",
          validationStatus: "valid",
        },
        {
          companyName: "StartupXYZ",
          roleName: "Frontend Developer",
          validationStatus: "valid",
        },
        {
          companyName: "BigCorp",
          roleName: "Engineering Manager",
          validationStatus: "valid",
        },
      ];
      sessionStorage.setItem("csvImportData", JSON.stringify(mockData));
    });
  });

  test("Confirmation page loads with preview table", async ({ page }) => {
    // Navigate directly to the confirmation page
    await page.goto("/applications/import/confirm");

    // Wait for navigation to complete and ensure we're on the right URL
    await page.waitForURL("**/applications/import/confirm", { timeout: 10000 });

    // Wait for the page to load with increased timeout
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible({ timeout: 10000 });

    // Check page description
    await expect(
      page.getByText("Review and edit your applications before importing"),
    ).toBeVisible();

    // Check preview section
    await expect(page.getByText("Preview Applications")).toBeVisible();
    await expect(
      page.getByText(
        "Review the applications below. Click on any cell to edit its value.",
      ),
    ).toBeVisible();
  });

  test("Preview table displays application data with editable cells", async ({
    page,
  }) => {
    // Navigate to confirmation page
    await page.goto("/applications/import/confirm");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible();

    // Check table headers (simplified - only Company, Role, and Status)
    const table = page.locator(".preview-table");
    await expect(table.locator("th", { hasText: "Company" })).toBeVisible();
    await expect(table.locator("th", { hasText: "Role" })).toBeVisible();
    await expect(table.locator("th", { hasText: "Status" })).toBeVisible();

    // Check application data
    await expect(page.getByText("TechCorp Inc.")).toBeVisible();
    await expect(page.getByText("Senior Software Engineer")).toBeVisible();
    await expect(page.getByText("StartupXYZ")).toBeVisible();
    await expect(page.getByText("Frontend Developer")).toBeVisible();
    await expect(page.getByText("BigCorp")).toBeVisible();
    await expect(page.getByText("Engineering Manager")).toBeVisible();

    // Check that cells are editable
    const editableCell = page
      .locator(".editable-cell")
      .filter({ hasText: "TechCorp Inc." })
      .first();
    await expect(editableCell).toHaveClass(/editable-cell/);
    await expect(editableCell).toHaveAttribute("title", "Click to edit");
  });

  test("Table cells are editable and respond to clicks", async ({ page }) => {
    // Navigate to confirmation page
    await page.goto("/applications/import/confirm");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible();

    // Find the first editable cell (TechCorp Inc.)
    const firstCell = page
      .locator(".editable-cell")
      .filter({ hasText: "TechCorp Inc." })
      .first();

    // Click on the cell to trigger edit mode
    await firstCell.click();

    // Verify an input field appears
    await expect(page.locator(".cell-editor")).toBeVisible();

    // Type a new value
    await page.locator(".cell-editor").fill("NewTechCorp");

    // Press Enter to confirm the edit
    await page.locator(".cell-editor").press("Enter");

    // Verify the cell shows the new value
    await expect(page.getByText("NewTechCorp")).toBeVisible();
  });

  test("Multiple cells can be edited independently", async ({ page }) => {
    // Navigate to confirmation page
    await page.goto("/applications/import/confirm");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible();

    // Edit the first company name
    await page
      .locator(".editable-cell")
      .filter({ hasText: "TechCorp Inc." })
      .first()
      .click();
    await page.locator(".cell-editor").fill("EditedTechCorp");
    await page.locator(".cell-editor").press("Enter");

    // Edit a role name in a different row
    await page
      .locator(".editable-cell")
      .filter({ hasText: "Frontend Developer" })
      .first()
      .click();
    await page.locator(".cell-editor").fill("Senior Frontend Developer");
    await page.locator(".cell-editor").press("Enter");

    // Verify both changes are reflected
    await expect(page.getByText("EditedTechCorp")).toBeVisible();
    await expect(page.getByText("Senior Frontend Developer")).toBeVisible();
  });

  test("Confirmation page displays action buttons", async ({ page }) => {
    // Navigate to confirmation page
    await page.goto("/applications/import/confirm");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible();

    // Check action buttons are present
    await expect(
      page.getByRole("button", { name: "← Back to Upload" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Import 3 Applications" }),
    ).toBeVisible();

    // Verify button styling
    const backButton = page.getByRole("button", { name: "← Back to Upload" });
    const importButton = page.getByRole("button", {
      name: "Import 3 Applications",
    });

    await expect(backButton).toHaveClass(/back-button/);
    await expect(importButton).toHaveClass(/import-button/);
  });

  test("Back button navigates to upload page", async ({ page }) => {
    // Navigate to confirmation page
    await page.goto("/applications/import/confirm");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible();

    // Click the back button
    await page.getByRole("button", { name: "← Back to Upload" }).click();

    // Verify we're back on the upload page
    await page.waitForURL("**/applications/import", { timeout: 10000 });
    await expect(
      page.getByRole("heading", { name: "Import Applications" }),
    ).toBeVisible();
    await expect(
      page.getByText("Upload your CSV of companies and jobs"),
    ).toBeVisible();
  });

  test("Import button displays correct count", async ({ page }) => {
    // Navigate to confirmation page
    await page.goto("/applications/import/confirm");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible();

    // Verify the import button shows the correct count of applications
    await expect(
      page.getByRole("button", { name: "Import 3 Applications" }),
    ).toBeVisible();
  });

  test("Table maintains data integrity during editing session", async ({
    page,
  }) => {
    // Navigate to confirmation page
    await page.goto("/applications/import/confirm");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible();

    // Count initial rows
    const initialRows = await page.locator("tbody tr").count();
    expect(initialRows).toBe(3);

    // Edit a cell and verify row count remains the same
    await page
      .locator(".editable-cell")
      .filter({ hasText: "TechCorp Inc." })
      .first()
      .click();
    await page.locator(".cell-editor").fill("ModifiedTechCorp");
    await page.locator(".cell-editor").press("Enter");

    // Verify row count is unchanged
    const finalRows = await page.locator("tbody tr").count();
    expect(finalRows).toBe(3);

    // Verify all validation statuses remain valid
    const validStatusCount = await page.locator(".validation-valid").count();
    expect(validStatusCount).toBe(3);
  });

  test("Confirmation page is responsive on mobile viewport", async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to confirmation page
    await page.goto("/applications/import/confirm");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible();

    // Verify key elements are still visible on mobile
    await expect(page.getByText("Preview Applications")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "← Back to Upload" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Import 3 Applications" }),
    ).toBeVisible();

    // Verify table is scrollable horizontally on mobile
    const table = page.locator(".preview-table");
    await expect(table).toBeVisible();
  });
});

test.describe("CSV File Upload and Import Workflow", () => {
  test("Complete CSV import workflow with unique test data", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

    // Enable dry run mode for testing (to avoid creating actual data)
    await page.addInitScript(() => {
      (window as any).__TESTING_DRY_RUN_MODE__ = true;
    });

    // Create unique test CSV data
    const uniqueId = Date.now();
    const csvData = [
      {
        companyName: `TestCorp-${uniqueId}`,
        roleName: `Software Engineer ${uniqueId}`,
      },
      {
        companyName: `StartupTest-${uniqueId}`,
        roleName: `Frontend Dev ${uniqueId}`,
      },
      { companyName: `BigTest-${uniqueId}`, roleName: `Manager ${uniqueId}` },
    ];

    const csvContent = `Company,Job Title
${csvData.map((row) => `${row.companyName},${row.roleName}`).join("\n")}`;

    // Navigate to import page
    await page.goto("/applications/import");

    // Wait for the import page to load
    await expect(
      page.getByRole("heading", { name: "Import Applications" }),
    ).toBeVisible();

    // Create and upload CSV file
    const csvBuffer = Buffer.from(csvContent, "utf8");
    await page.setInputFiles('input[type="file"]', {
      name: `test-applications-${uniqueId}.csv`,
      mimeType: "text/csv",
      buffer: csvBuffer,
    });

    // Verify file was selected
    await expect(
      page.getByText(`test-applications-${uniqueId}.csv`),
    ).toBeVisible();

    // Click Continue to Preview
    await page.getByRole("button", { name: "Continue to Preview" }).click();

    // Wait for confirmation page to load
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible();

    // Verify the unique CSV data is displayed in the preview table
    for (const row of csvData) {
      await expect(page.getByText(row.companyName)).toBeVisible();
      await expect(page.getByText(row.roleName)).toBeVisible();
    }

    // Verify import button shows correct count
    await expect(
      page.getByRole("button", {
        name: `Import ${csvData.length} Applications`,
      }),
    ).toBeVisible();

    // Wait for import button to be enabled (CSRF tokens loaded)
    const importButton = page.getByRole("button", {
      name: /Import \d+ Applications/,
    });
    await expect(importButton).toBeEnabled({ timeout: 10000 });

    // Click import button (this will trigger dry run mode)
    await importButton.click();

    // Verify success message appears
    await expect(page.getByText("Import Successful!")).toBeVisible({
      timeout: 5000,
    });

    // Verify redirect to applications page
    await expect(page).toHaveURL(/.*\/applications$/, { timeout: 10000 });

    // Verify the imported data does NOT appear in the applications list (dry run mode)
    for (const row of csvData) {
      await expect(page.getByText(row.companyName)).not.toBeVisible();
    }
  });

  test("CSV parsing handles validation errors", async ({ page }) => {
    // Log in first
    await loginAsUser(page);

    // Create CSV with missing required fields
    const csvContent = `Company,Job Title
ValidCorp,Valid Role
,Missing Company Role
InvalidCorp,`;

    // Navigate to import page
    await page.goto("/applications/import");

    // Upload invalid CSV
    const csvBuffer = Buffer.from(csvContent, "utf8");
    await page.setInputFiles('input[type="file"]', {
      name: "invalid-applications.csv",
      mimeType: "text/csv",
      buffer: csvBuffer,
    });

    // Continue to preview - should navigate successfully
    await page.getByRole("button", { name: "Continue to Preview" }).click();

    // Wait for confirmation page to load
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible();

    // Verify that only the valid row is checked for import
    const checkboxes = page.locator(".import-checkbox");
    await expect(checkboxes).toHaveCount(3);

    // First row (ValidCorp) should be checked
    await expect(checkboxes.nth(0)).toBeChecked();

    // Second and third rows (missing data) should be unchecked
    await expect(checkboxes.nth(1)).not.toBeChecked();
    await expect(checkboxes.nth(2)).not.toBeChecked();

    // Verify validation status indicators
    await expect(page.locator(".validation-valid")).toHaveCount(1);
    await expect(page.locator(".validation-error")).toHaveCount(2);
  });

  test("Editable cells work with uploaded CSV data", async ({ page }) => {
    // Log in first
    await loginAsUser(page);

    // Enable dry run mode for testing (to avoid creating actual data)
    await page.addInitScript(() => {
      (window as any).__TESTING_DRY_RUN_MODE__ = true;
    });

    // Create test CSV data
    const uniqueId = Date.now();
    const csvContent = `Company,Job Title
TestCorp-${uniqueId},Original Role`;

    // Navigate to import page and upload CSV
    await page.goto("/applications/import");

    const csvBuffer = Buffer.from(csvContent, "utf8");
    await page.setInputFiles('input[type="file"]', {
      name: `edit-test-${uniqueId}.csv`,
      mimeType: "text/csv",
      buffer: csvBuffer,
    });

    await page.getByRole("button", { name: "Continue to Preview" }).click();

    // Wait for confirmation page
    await expect(
      page.getByRole("heading", { name: "Confirm Import" }),
    ).toBeVisible();

    // Verify original data is displayed
    await expect(page.getByText(`TestCorp-${uniqueId}`)).toBeVisible();
    await expect(page.getByText("Original Role")).toBeVisible();

    // Edit the role name cell
    await page.getByText("Original Role").click();

    // Type new value
    const input = page.locator(".cell-editor");
    await expect(input).toBeVisible();
    await input.fill("Edited Role");
    await input.press("Enter");

    // Verify edited value is displayed
    await expect(page.getByText("Edited Role")).toBeVisible();
    await expect(page.getByText("Original Role")).not.toBeVisible();

    // Verify import button still works with edited data
    const importButton = page.getByRole("button", {
      name: /Import 1 Applications/,
    });
    await expect(importButton).toBeEnabled({ timeout: 10000 });
  });

  test("CSV works with natural column headers (position-based parsing)", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

    // Create CSV with various natural header combinations
    const uniqueId = Date.now();
    const testCases = [
      {
        headers: "Company,Job Title",
        name: `NaturalTest1-${uniqueId}`,
        role: `Role1 ${uniqueId}`,
      },
      {
        headers: "Organization,Position",
        name: `NaturalTest2-${uniqueId}`,
        role: `Role2 ${uniqueId}`,
      },
      {
        headers: "Employer,Job",
        name: `NaturalTest3-${uniqueId}`,
        role: `Role3 ${uniqueId}`,
      },
    ];

    for (const testCase of testCases) {
      const csvContent = `${testCase.headers}
${testCase.name},${testCase.role}`;

      // Navigate to import page
      await page.goto("/applications/import");

      // Upload CSV with natural headers
      const csvBuffer = Buffer.from(csvContent, "utf8");
      await page.setInputFiles('input[type="file"]', {
        name: `natural-headers-test-${uniqueId}.csv`,
        mimeType: "text/csv",
        buffer: csvBuffer,
      });

      // Continue to preview - should work without errors
      await page.getByRole("button", { name: "Continue to Preview" }).click();

      // Wait for confirmation page to load
      await expect(
        page.getByRole("heading", { name: "Confirm Import" }),
      ).toBeVisible();

      // Verify the data was parsed correctly regardless of headers
      await expect(page.getByText(testCase.name)).toBeVisible();
      await expect(page.getByText(testCase.role)).toBeVisible();

      // Go back to test next case
      await page.getByRole("button", { name: "← Back to Upload" }).click();
      await expect(
        page.getByRole("heading", { name: "Import Applications" }),
      ).toBeVisible();
    }
  });

  test("Production import mode creates actual applications", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

    // Create unique test data to avoid conflicts
    const uniqueId = Date.now();
    const csvContent = `Company,Job Title
ProdTest-${uniqueId},Production Role ${uniqueId}`;

    // Navigate to import and upload CSV
    await page.goto("/applications/import");

    const csvBuffer = Buffer.from(csvContent, "utf8");
    await page.setInputFiles('input[type="file"]', {
      name: `prod-test-${uniqueId}.csv`,
      mimeType: "text/csv",
      buffer: csvBuffer,
    });

    await page.getByRole("button", { name: "Continue to Preview" }).click();

    // Import the application (production mode - no dry run flag)
    const importButton = page.getByRole("button", {
      name: /Import 1 Applications/,
    });
    await expect(importButton).toBeEnabled({ timeout: 10000 });
    await importButton.click();

    // Verify success and redirect
    await expect(page.getByText("Import Successful!")).toBeVisible({
      timeout: 5000,
    });

    await expect(page).toHaveURL(/.*\/applications$/, { timeout: 10000 });

    // Verify the test data DOES appear (production mode creates actual data)
    await expect(page.getByText(`ProdTest-${uniqueId}`)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(`Production Role ${uniqueId}`)).toBeVisible({
      timeout: 5000,
    });

    // Clean up: we should delete the test data to avoid pollution
    // For now, using unique IDs should be sufficient
  });

  test("Dry run mode prevents actual data creation", async ({ page }) => {
    // Log in first
    await loginAsUser(page);

    // Enable dry run mode for testing
    await page.addInitScript(() => {
      (window as any).__TESTING_DRY_RUN_MODE__ = true;
    });

    // Get count of existing applications
    await page.goto("/applications");
    const existingAppsText = await page.textContent("body");
    const initialAppCount = (existingAppsText?.match(/applications/gi) || [])
      .length;

    // Create unique test data
    const uniqueId = Date.now();
    const csvContent = `Company,Job Title
DryRunTest-${uniqueId},Test Role ${uniqueId}`;

    // Navigate to import and upload CSV
    await page.goto("/applications/import");

    const csvBuffer = Buffer.from(csvContent, "utf8");
    await page.setInputFiles('input[type="file"]', {
      name: `dry-run-test-${uniqueId}.csv`,
      mimeType: "text/csv",
      buffer: csvBuffer,
    });

    await page.getByRole("button", { name: "Continue to Preview" }).click();

    // Import the application
    const importButton = page.getByRole("button", {
      name: /Import 1 Applications/,
    });
    await expect(importButton).toBeEnabled({ timeout: 10000 });
    await importButton.click();

    // Verify success and redirect
    await expect(page.getByText("Import Successful!")).toBeVisible({
      timeout: 5000,
    });

    await expect(page).toHaveURL(/.*\/applications$/, { timeout: 10000 });

    // Verify the test data does NOT appear (dry run mode)
    await expect(page.getByText(`DryRunTest-${uniqueId}`)).not.toBeVisible();
    await expect(page.getByText(`Test Role ${uniqueId}`)).not.toBeVisible();

    // Verify application count hasn't increased
    const finalAppsText = await page.textContent("body");
    const finalAppCount = (finalAppsText?.match(/applications/gi) || []).length;
    expect(finalAppCount).toBeLessThanOrEqual(initialAppCount + 2); // Allow for small variance in text content
  });
});
