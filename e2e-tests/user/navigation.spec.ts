import { test, expect } from "@playwright/test";
import { setupEncryptionForTest } from "../utils/encryption-setup";

test.describe("Navigation and Session Persistence", () => {
  test.describe("User Session Tests", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/applications");
      await page.waitForLoadState("networkidle");
      await setupEncryptionForTest(page);
    });

    test("Client-side navigation preserves user session", async ({ page }) => {
      // Navigate to applications page
      await page.goto("/applications");
      // Use client-side navigation to applications (via link click)
      await page.getByRole("link", { name: "Applications" }).click();

      // Verify we're on applications page and session is maintained
      await expect(
        page.getByRole("heading", { name: "Applications" }),
      ).toBeVisible();
    });

    test("Direct URL navigation preserves user session", async ({ page }) => {
      // Navigate directly to applications page via URL
      await page.goto("/applications");

      // Verify we're on applications page and session is maintained
      await expect(
        page.getByRole("heading", { name: "Applications" }),
      ).toBeVisible();
    });

    test("Page refresh preserves user session", async ({ page }) => {
      // Navigate to applications page
      await page.goto("/applications");
      await expect(
        page.getByRole("heading", { name: "Applications" }),
      ).toBeVisible();

      // Refresh the page
      await page.reload();

      // Verify session is still maintained after refresh
      await expect(
        page.getByRole("heading", { name: "Applications" }),
      ).toBeVisible();
    });
  });

  test.describe("Authorization and Deep Links", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/applications");
      await page.waitForLoadState("networkidle");
      await setupEncryptionForTest(page);
    });

    test("Regular user cannot access admin routes", async ({ page }) => {
      // Try to access admin route
      await page.goto("/admin/users");

      // Wait for authentication state to be fully loaded after navigation
      await expect(page.locator("button.logout-button")).toBeVisible();

      // Should be redirected or see unauthorized message
      // The exact behavior depends on your auth implementation
      // This might redirect to login, show 403, or redirect to user dashboard
      expect(page.url()).not.toContain("/admin/users");
    });
  });
});
