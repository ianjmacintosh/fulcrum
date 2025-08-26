import { test, expect } from "@playwright/test";
import { loginAsUser } from "./test-utils";

test.describe.serial("Applications", () => {
  test("Applications page loads and displays job applications", async ({
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
    await expect(
      page.getByText(
        "Track all applications and update job status throughout the process",
      ),
    ).toBeVisible();

    // Check that the summary stats are displayed
    await expect(page.getByText("Total Applications")).toBeVisible();
    await expect(page.getByText("Open Applications")).toBeVisible();
    await expect(page.getByText("Closed/Rejected")).toBeVisible();

    // Check that the add new application buttons are present (should be 2 now)
    const addButtons = page.getByRole("link", {
      name: "+ Add New Application",
    });
    await expect(addButtons).toHaveCount(2);
    await expect(addButtons.first()).toBeVisible();
  });

  test("Applications page displays application cards when data exists", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

    // Navigate to applications page
    await page.goto("/applications");

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Applications" }),
    ).toBeVisible();

    // Check if there are application cards OR the no applications message
    const hasApplicationCards =
      (await page.locator(".application-card").count()) > 0;
    const hasNoApplicationsMessage = await page
      .locator(".no-applications")
      .isVisible();

    // Either there should be application cards OR a "No Job Applications" message
    expect(hasApplicationCards || hasNoApplicationsMessage).toBe(true);

    // If there are application cards, verify they have the expected structure
    if (hasApplicationCards) {
      const firstCard = page.locator(".application-card").first();
      await expect(firstCard).toBeVisible();

      // Each card should have a company name and role
      await expect(firstCard.locator(".company-name")).toBeVisible();
      await expect(firstCard.locator(".role-name")).toBeVisible();
      await expect(firstCard.locator(".status-badge")).toBeVisible();
    }
  });

  test("Add New Application button navigates to the correct page", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

    // Verify we're logged in by checking for the logout button
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

    // Navigate to applications page
    await page.goto("/applications");

    // Wait for authentication state to be fully loaded after navigation
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

    // Wait for the page to be fully loaded before clicking the button
    await expect(
      page.getByRole("heading", { name: "Applications" }),
    ).toBeVisible();

    // Wait for the Add New Application buttons to be visible (there should be 2 now)
    const addButtons = page.getByRole("link", {
      name: "+ Add New Application",
    });
    await expect(addButtons.first()).toBeVisible();

    // Click on the first Add New Application button
    await addButtons.first().click();

    // Verify we're on the new application page
    expect(page.url()).toContain("/applications/new");
  });

  test("Application cards navigate to details page correctly", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

    // Navigate to applications page
    await page.goto("/applications");

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
    // Log in first
    await loginAsUser(page);

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

  test("Can create application with only required fields", async ({ page }) => {
    // Log in first
    await loginAsUser(page);

    // Navigate to new application page
    await page.goto("/applications/new");

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

    await expect(applicationCard).toBeVisible();
  });

  test("Shows 'Not Applied' status for jobs without applied date", async ({
    page,
  }) => {
    // Log in first
    await loginAsUser(page);

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
    // Log in first
    await loginAsUser(page);

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
    // Log in first
    await loginAsUser(page);

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
    // Log in first
    await loginAsUser(page);

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
    // Log in first
    await loginAsUser(page);

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
}); // Close test.describe.serial
