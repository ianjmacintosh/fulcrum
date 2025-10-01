import { test, expect } from "@playwright/test";
import { setupEncryptionForTest } from "../utils/encryption-setup";

/**
 * End-to-end test for application creation events
 *
 * Verifies that when a new application is created through the UI,
 * it automatically includes a "Application created" event with the
 * correct date information displayed to the user.
 */
test.describe("Application Creation Events", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/applications");
    await page.waitForLoadState("networkidle");
    await setupEncryptionForTest(page);
  });

  test.only("should create application with creation event - no applied date", async ({
    page,
  }) => {
    // Navigate to the new application form
    await page.goto("/applications/new");

    // Wait for form to load
    await expect(
      page.getByRole("heading", { name: "Add New Job" }),
    ).toBeVisible();

    // Fill out the application form WITHOUT applied date - use unique names to avoid conflicts
    const timestamp = Date.now();
    await page.fill("#companyName", `Test Company E2E ${timestamp}`);
    await page.fill("#roleName", `Software Engineer E2E ${timestamp}`);
    await page.fill("#jobPostingUrl", "https://example.com/job-e2e");
    await page.fill(
      "#notes",
      "End-to-end test application notes - no applied date",
    );

    // Submit the form
    await page.getByRole("button", { name: "Add Job" }).click();

    // Wait for success message briefly, then redirect to applications page
    // The success message appears for 1.5s before redirecting
    await expect(page.getByText("Job added successfully!")).toBeVisible({
      timeout: 5000,
    });

    // Should redirect to applications list after brief delay
    await page.waitForURL("/applications", { timeout: 10000 });

    // Wait for the applications list to load and refresh
    await page.waitForLoadState("networkidle");

    // Debug: Check if any application cards exist at all
    const allCards = page.locator('[data-testid="application-card"]');
    const cardCount = await allCards.count();
    console.log(`Found ${cardCount} application cards on the page`);

    // Look for our created application using the correct selector
    const applicationCard = page
      .locator('[data-testid="application-card"]')
      .filter({ hasText: `Test Company E2E ${timestamp}` });
    await expect(applicationCard).toBeVisible({ timeout: 10000 });

    // Click on the application card to view details
    await applicationCard.click();

    // Wait for navigation to details page
    await page.waitForURL(/\/applications\/[a-f0-9]{24}\/details/);
    await expect(
      page.getByRole("heading", { name: "Application Details" }),
    ).toBeVisible();

    // Verify the application timeline section is present
    await expect(
      page.getByRole("heading", { name: "Application Timeline" }),
    ).toBeVisible();

    // Should have exactly 1 event (creation event only, no applied date provided)
    // Look for events in the timeline - each event should be in a list item or event container

    // If no specific events container, look for individual events
    const eventItems = page.locator(':text("Application created")');
    await expect(eventItems.first()).toBeVisible();

    // Verify the creation event details
    const creationEventText = await page
      .locator(':text("Application created")')
      .first()
      .textContent();
    expect(creationEventText).toContain("Application created");

    // Also verify we don't see any "Application submitted" events since no applied date was provided
    const submittedEvents = page.locator(':text("Application submitted")');
    await expect(submittedEvents).toHaveCount(0);
  });

  test("should create application with both creation and submitted events - with applied date", async ({
    page,
  }) => {
    // Navigate to the new application form
    await page.goto("/applications/new");

    // Wait for form to load
    await expect(
      page.getByRole("heading", { name: "Add New Job" }),
    ).toBeVisible();

    // Fill out the application form WITH applied date - use unique names to avoid conflicts
    const timestamp = Date.now();
    await page.fill("#companyName", `Test Company Applied E2E ${timestamp}`);
    await page.fill("#roleName", `Senior Engineer E2E ${timestamp}`);
    await page.fill("#jobPostingUrl", "https://example.com/job-applied-e2e");

    // Set applied date to a specific date
    const appliedDate = "2024-01-15";
    await page.fill("#appliedDate", appliedDate);

    await page.fill("#notes", "Applied on January 15th - should have 2 events");

    // Submit the form
    await page.getByRole("button", { name: "Add Job" }).click();

    // Wait for success message
    await expect(page.getByText("Job added successfully!")).toBeVisible();

    // Should redirect to applications list
    await page.waitForURL("/applications");

    // Find and click on our created application
    const applicationCard = page
      .locator('[data-testid="application-card"]')
      .filter({ hasText: `Test Company Applied E2E ${timestamp}` });
    await expect(applicationCard).toBeVisible();
    await applicationCard.click();

    // Wait for navigation to details page
    await page.waitForURL(/\/applications\/[a-f0-9]{24}\/details/);
    await expect(
      page.getByRole("heading", { name: "Application Details" }),
    ).toBeVisible();

    // Verify the application timeline section is present
    await expect(
      page.getByRole("heading", { name: "Application Timeline" }),
    ).toBeVisible();

    // Verify creation event exists
    const creationEvent = page.locator(':text("Application created")');
    await expect(creationEvent.first()).toBeVisible();

    // Verify submitted event exists
    const submittedEvent = page.locator(':text("Application submitted")');
    await expect(submittedEvent.first()).toBeVisible();

    // Both events should be present on the page
    const allEventTexts = await page.locator("body").textContent();
    expect(allEventTexts).toContain("Application created");
    expect(allEventTexts).toContain("Application submitted");
  });

  test("should verify creation event shows correct status on applications list", async ({
    page,
  }) => {
    // Navigate to new application form
    await page.goto("/applications/new");

    // Wait for form to load
    await expect(
      page.getByRole("heading", { name: "Add New Job" }),
    ).toBeVisible();

    // Create application WITHOUT applied date - use unique names
    const timestamp = Date.now();
    await page.fill("#companyName", `Status Test Company ${timestamp}`);
    await page.fill("#roleName", "Test Engineer");
    // No applied date - should show "Not Applied" status

    // Submit the form
    await page.getByRole("button", { name: "Add Job" }).click();

    // Wait for success message and redirect
    await expect(page.getByText("Job added successfully!")).toBeVisible();
    await page.waitForURL("/applications");

    // Find the application card and verify it shows correct status
    const applicationCard = page
      .locator('[data-testid="application-card"]')
      .filter({ hasText: `Status Test Company ${timestamp}` });
    await expect(applicationCard).toBeVisible();

    // Should show "Not Applied" status since no appliedDate was provided
    await expect(applicationCard.locator(".status-badge")).toContainText(
      "Not Applied",
    );
  });

  test("should verify submitted event shows correct status on applications list", async ({
    page,
  }) => {
    // Navigate to new application form
    await page.goto("/applications/new");

    // Wait for form to load
    await expect(
      page.getByRole("heading", { name: "Add New Job" }),
    ).toBeVisible();

    // Create application WITH applied date - use unique names
    const timestamp = Date.now();
    await page.fill("#companyName", `Applied Status Test ${timestamp}`);
    await page.fill("#roleName", "Applied Engineer");
    await page.fill("#appliedDate", "2024-03-20");

    // Submit the form
    await page.getByRole("button", { name: "Add Job" }).click();

    // Wait for success message and redirect
    await expect(page.getByText("Job added successfully!")).toBeVisible();
    await page.waitForURL("/applications");

    // Find the application card and verify it shows correct status
    const applicationCard = page
      .locator('[data-testid="application-card"]')
      .filter({ hasText: `Applied Status Test ${timestamp}` });
    await expect(applicationCard).toBeVisible();

    // Should show "Applied" status since appliedDate was provided
    await expect(applicationCard.locator(".status-badge")).toContainText(
      "Applied",
    );
  });
});
