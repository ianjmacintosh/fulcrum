import { test, expect } from "@playwright/test";
import { setupEncryptionForTest } from "../utils/encryption-setup";

/**
 * Simplified end-to-end test for application creation events
 *
 * This test follows the exact same pattern as the working tests in applications.spec.ts
 * but then verifies that the created application has the expected events in the timeline.
 */
test.describe("Application Creation Events - Simple", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/applications");
    await page.waitForLoadState("networkidle");
    await setupEncryptionForTest(page);
  });

  test("should create application and verify it has creation event in timeline", async ({
    page,
  }) => {
    // This follows the exact pattern from applications.spec.ts that we know works
    await page.goto("/applications/new");

    // Use unique company name to avoid conflicts with existing test data
    const timestamp = Date.now();
    const uniqueCompany = `EventTestCorp-${timestamp}`;

    // Fill in required fields only (no applied date) - this should create just 1 creation event
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

    // Click on the application card to go to details
    await applicationCard.click();

    // Wait for navigation to details page
    await page.waitForURL(/\/applications\/[a-f0-9]{24}\/details/);
    await expect(
      page.getByRole("heading", { name: "Application Details" }),
    ).toBeVisible();

    // Verify the Application Timeline section exists
    await expect(
      page.getByRole("heading", { name: "Application Timeline" }),
    ).toBeVisible();

    // Look for "Application created" text somewhere on the page
    // This is the key test - verifying our creation event is present
    await expect(page.locator(':text("Application created")')).toBeVisible();

    // Since we didn't provide an applied date, we should NOT see "Application submitted"
    const submittedEvents = page.locator(':text("Application submitted")');
    await expect(submittedEvents).toHaveCount(0);

    // The application should show "Not Applied" status since no appliedDate was provided
    // (This verifies our server logic is working correctly)
  });

  test("should create application with applied date and verify both events exist", async ({
    page,
  }) => {
    // Create application WITH applied date - should have 2 events
    await page.goto("/applications/new");

    const timestamp = Date.now();
    const uniqueCompany = `EventAppliedCorp-${timestamp}`;

    // Fill in required fields AND applied date
    await page.fill("#companyName", uniqueCompany);
    await page.fill("#roleName", "Senior Engineer");
    await page.fill("#appliedDate", "2024-01-15"); // This should create a submitted event

    // Submit the form
    await page.getByRole("button", { name: "Add Job" }).click();

    // Wait for success message and redirect
    await expect(page.getByText("Job added successfully!")).toBeVisible();
    await page.waitForURL("/applications");

    // Find and click on our application
    const applicationCard = page
      .locator(".application-card")
      .filter({ hasText: uniqueCompany });
    await expect(applicationCard).toBeVisible();
    await applicationCard.click();

    // Wait for details page
    await page.waitForURL(/\/applications\/[a-f0-9]{24}\/details/);
    await expect(
      page.getByRole("heading", { name: "Application Details" }),
    ).toBeVisible();

    // Verify the Application Timeline section exists
    await expect(
      page.getByRole("heading", { name: "Application Timeline" }),
    ).toBeVisible();

    // Should have BOTH "Application created" AND "Application submitted" events
    await expect(page.locator(':text("Application created")')).toBeVisible();
    await expect(page.locator(':text("Application submitted")')).toBeVisible();

    // The application should show "Applied" status since appliedDate was provided
    // We can verify this by going back to applications list and checking the status badge
  });
});
