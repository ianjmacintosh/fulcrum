import { test, expect } from "@playwright/test";
import { setupEncryptionForTest } from "../utils/encryption-setup";

test.describe("Applications", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/applications");
    // Wait for page reload triggered by setupEncryptionForTest
    await page.waitForLoadState("networkidle");
    await setupEncryptionForTest(page);
  });

  test("Applications page loads", async ({ page }) => {
    // Check that the applications page loads
    await expect(
      page.getByRole("heading", { name: "Applications" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Track all applications and update job status throughout the process",
      ),
    ).toBeVisible();

    // Check that the summary stats are displayed
    await expect(page.getByText("Total Applications")).toBeVisible();
    await expect(page.getByText("Open Applications")).toBeVisible();
    await expect(page.getByText("Closed/Rejected")).toBeVisible();
  });

  test("Encryption key is properly set up for tests", async ({ page }) => {
    // Debug: Check what's actually on the page
    console.log("Page URL:", await page.url());

    // Check for error messages
    const pageErrorMessages = await page
      .locator(".error-message")
      .allTextContents();
    console.log("Error messages on page:", pageErrorMessages);

    // Get full text of first error message if it exists
    const firstError = page.locator(".error-message").first();
    if (await firstError.isVisible()) {
      const fullErrorText = await firstError.textContent();
      console.log("Full error text:", fullErrorText);
    }

    // Check for loading messages
    const loadingMessages = await page
      .locator(".loading-message")
      .allTextContents();
    console.log("Loading messages on page:", loadingMessages);

    // Check what headings exist
    const headings = await page.locator("h1, h2, h3").allTextContents();
    console.log("All headings on page:", headings);

    // Wait for the page to be fully loaded
    await expect(
      page.getByRole("heading", { name: "Applications" }),
    ).toBeVisible();

    // Check that the page loads without "Invalid time value" errors
    // (This was the original issue - encrypted dates causing crashes)
    const errorMessages = page.locator(".error-message, [data-testid='error']");
    await expect(errorMessages).toHaveCount(0);

    // Verify that application cards are displayed (indicating data was decrypted successfully)
    const applicationCards = page.locator(
      '[data-testid="application-card"], .application-card',
    );
    // Should have at least some cards (from seed data) or show "No applications" message
    const hasCards = (await applicationCards.count()) > 0;
    const hasNoApplicationsMessage = await page
      .getByText("No Job Applications")
      .isVisible();

    // Either we have application cards or a proper "no applications" message
    expect(hasCards || hasNoApplicationsMessage).toBe(true);

    // If we have cards, verify they don't contain encrypted gibberish
    if (hasCards) {
      const firstCard = applicationCards.first();
      const cardText = await firstCard.textContent();
      // Encrypted data would look like base64 strings, not readable company/role names
      expect(cardText).not.toMatch(/^[A-Za-z0-9+/]+=*$/);
    }
  });

  test.only("Can create new job applications", async ({ page }) => {
    // Check that both "add new application" buttons are visible
    const addButtons = page.getByRole("link", {
      name: "+ Add New Application",
    });
    await expect(addButtons).toHaveCount(2);

    // Click on the first Add New Application button
    await addButtons.first().click();

    // Verify we're on the new application page
    expect(page.url()).toContain("/applications/new");

    // Wait for the form to load
    await expect(
      page.getByRole("heading", { name: "Add New Job" }),
    ).toBeVisible();

    // Fill in only required fields with unique values to avoid conflicts
    const timestamp = Date.now();
    await page.fill("#companyName", `TestCorp-${timestamp}`);
    await page.fill("#roleName", `Senior Software Engineer ${timestamp}`);

    // Submit the form
    await page.getByRole("button", { name: "Add Job" }).click();

    // Wait for success message
    await expect(page.getByText("Job added successfully!")).toBeVisible();

    // Should redirect to applications list
    await page.waitForURL("/applications");

    // Verify we're on applications page
    await expect(
      page.getByRole("heading", { name: "Applications" }),
    ).toBeVisible();

    // Verify new application appears in the list using specific filter
    const applicationCard = page
      .locator('[data-testid="application-card"]')
      .filter({ hasText: `TestCorp-${timestamp}` })
      .filter({ hasText: `Senior Software Engineer ${timestamp}` });

    // If an error message displays, fail the test
    const errorMessage = page.getByText("API Error: 500");
    if (await errorMessage.isVisible()) {
      throw new Error("Failed to add job application");
    }

    await expect(applicationCard).toBeVisible();
  });

  test("Application cards navigate to details page correctly", async ({
    page,
  }) => {
    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Applications" }),
    ).toBeVisible();

    // Wait for application cards to load - they should be there since seed data exists
    await expect(page.locator(".application-card-link").first()).toBeVisible({
      timeout: 10000,
    });

    // Verify we don't see "No applications" message since seed data should exist
    await expect(page.locator(".no-applications")).not.toBeVisible();

    // Get the first application card
    const firstCard = page.locator(".application-card-link").first();

    // Verify the card has required elements
    await expect(firstCard.locator(".company-name")).toBeVisible();
    await expect(firstCard.locator(".role-name")).toBeVisible();

    // Click on the first application card
    await firstCard.click();

    // Wait for navigation (should be fast - 5 seconds max)
    await page.waitForURL(/\/applications\/[a-f0-9]{24}\/details/, {
      timeout: 5000,
    });

    // Verify we're on the details page
    await expect(
      page.getByRole("heading", { name: "Application Details" }),
    ).toBeVisible({ timeout: 5000 });

    // Verify the page shows application content, not an error
    await expect(page.getByText("Application not found")).not.toBeVisible();

    // Verify key sections are present
    await expect(
      page.getByRole("heading", { name: "Application Timeline" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Add Event" }),
    ).toBeVisible();
  });

  test("New application form loads with correct requirements", async ({
    page,
  }) => {
    // Navigate to new application page
    await page.goto("/applications/new");

    // Check that the page loads with heading and description
    await expect(
      page.getByRole("heading", { name: "Add New Job" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Add a job you're interested in or have applied to. Only company name and job title are required.",
      ),
    ).toBeVisible();

    // Verify required fields have asterisks
    await expect(page.getByText("Company Name *")).toBeVisible();
    await expect(page.getByText("Job Title *")).toBeVisible();

    // Verify optional fields do NOT have asterisks
    await expect(page.getByText("Job URL")).toBeVisible();
    await expect(page.getByText("Applied Date")).toBeVisible(); // No asterisk
    await expect(page.getByText("Job Board", { exact: true })).toBeVisible(); // No asterisk
    await expect(page.getByText("Role Type")).toBeVisible(); // No asterisk
    await expect(page.getByText("Application Type")).toBeVisible(); // No asterisk
    await expect(page.getByText("Location Type")).toBeVisible(); // No asterisk

    // Verify defaults are selected
    await expect(
      page.locator('input[name="applicationType"][value="cold"]'),
    ).toBeChecked();
    await expect(
      page.locator('input[name="locationType"][value="remote"]'),
    ).toBeChecked();
    await expect(page.locator('select[name="roleType"]')).toHaveValue(
      "engineer",
    );

    // Verify button text
    await expect(page.getByRole("button", { name: "Add Job" })).toBeVisible();
  });

  test("Shows 'Not Applied' status for jobs without applied date", async ({
    page,
  }) => {
    // Navigate to new application page
    await page.goto("/applications/new");

    // Fill in required fields only - use unique names to avoid test conflicts
    const timestamp = Date.now();
    await page.fill("#companyName", `Future Opportunity Corp ${timestamp}`);
    await page.fill("#roleName", "Staff Engineer");
    await page.fill("#notes", "Great company culture, want to apply later");

    // Submit the form
    await page.getByRole("button", { name: "Add Job" }).click();

    // Wait for success and redirect
    await expect(page.getByText("Job added successfully!")).toBeVisible();
    await page.waitForURL("/applications");

    // Find the new application and verify status
    const applicationCard = page.locator(".application-card", {
      has: page.getByText(`Future Opportunity Corp ${timestamp}`),
    });
    await expect(applicationCard).toBeVisible();

    // Should show "Not Applied" status since no appliedDate was provided
    await expect(applicationCard.locator(".status-badge")).toContainText(
      "Not Applied",
    );
  });

  test("Creates event and sets status when applied date is provided", async ({
    page,
  }) => {
    // Navigate to new application page
    await page.goto("/applications/new");

    // Fill in required fields and applied date - use unique names to avoid test conflicts
    const timestamp = Date.now();
    await page.fill("#companyName", `Applied Corp ${timestamp}`);
    await page.fill("#roleName", "Frontend Developer");

    // Set an applied date
    await page.fill("#appliedDate", "2025-01-15");
    await page.fill("#notes", "Applied via LinkedIn");

    // Submit the form
    await page.getByRole("button", { name: "Add Job" }).click();

    // Wait for success and redirect
    await expect(page.getByText("Job added successfully!")).toBeVisible();
    await page.waitForURL("/applications");

    // Find the new application and verify status
    const applicationCard = page.locator(".application-card", {
      has: page.getByText(`Applied Corp ${timestamp}`),
    });
    await expect(applicationCard).toBeVisible();

    // Should show "Applied" status since appliedDate was provided
    await expect(applicationCard.locator(".status-badge")).toContainText(
      "Applied",
    );
  });

  test("Form validation works for required fields", async ({ page }) => {
    // Navigate to new application page
    await page.goto("/applications/new");

    // Try to submit without filling required fields
    await page.getByRole("button", { name: "Add Job" }).click();

    // HTML5 validation should prevent form submission
    // Check that we're still on the same page (not redirected)
    expect(page.url()).toContain("/applications/new");

    // Fill in one required field but leave the other empty
    const timestamp = Date.now();
    await page.fill("#companyName", `TestCorp-${timestamp}`);
    // Leave roleName empty

    // Try to submit again
    await page.getByRole("button", { name: "Add Job" }).click();

    // Should still be on the form page due to validation
    expect(page.url()).toContain("/applications/new");

    // Now fill in both required fields
    await page.fill("#roleName", "Engineer");

    // Submit should now work
    await page.getByRole("button", { name: "Add Job" }).click();

    // Should succeed and redirect
    await expect(page.getByText("Job added successfully!")).toBeVisible();
    await page.waitForURL("/applications");
  });

  test("New job without applied date shows 'Not Applied' status", async ({
    page,
  }) => {
    // Navigate to new application page
    await page.goto("/applications/new");

    // Use unique company name to avoid conflicts with existing test data
    const timestamp = Date.now();
    const uniqueCompany = `NotAppliedCorp-${timestamp}`;

    // Fill in required fields only (no applied date)
    await page.fill("#companyName", uniqueCompany);
    await page.fill("#roleName", "Software Engineer");
    // Leave Applied Date empty

    // Submit the form
    await page.getByRole("button", { name: "Add Job" }).click();

    // Wait for success message and redirect
    await expect(page.getByText("Job added successfully!")).toBeVisible();
    await page.waitForURL("/applications");

    // First verify the application card with our unique company exists
    const applicationCard = page
      .locator(".application-card")
      .filter({ hasText: uniqueCompany });

    await expect(applicationCard).toBeVisible();

    // Verify it contains the expected role
    await expect(applicationCard).toContainText("Software Engineer");

    // Now verify the status - check if it contains "Not Applied"
    await expect(applicationCard.locator(".status-badge")).toContainText(
      "Not Applied",
    );
  });

  test("New job with applied date shows 'Applied' status", async ({ page }) => {
    // Navigate to new application page
    await page.goto("/applications/new");

    // Use unique company name to avoid conflicts with existing test data
    const timestamp = Date.now();
    const uniqueCompany = `AppliedCorp-${timestamp}`;

    // Fill in required fields and applied date
    await page.fill("#companyName", uniqueCompany);
    await page.fill("#roleName", "Senior Engineer");
    await page.fill("#appliedDate", "2025-01-15");

    // Submit the form
    await page.getByRole("button", { name: "Add Job" }).click();

    // Wait for success message and redirect
    await expect(page.getByText("Job added successfully!")).toBeVisible();
    await page.waitForURL("/applications");

    // Find the application card with our unique company
    const applicationCard = page
      .locator(".application-card")
      .filter({ hasText: uniqueCompany });

    // Verify the application card exists
    await expect(applicationCard).toBeVisible();

    // Verify it contains the expected role
    await expect(applicationCard).toContainText("Senior Engineer");

    // Verify it shows "Applied" status
    await expect(applicationCard.locator(".status-badge")).toContainText(
      "Applied",
    );
  });
});
