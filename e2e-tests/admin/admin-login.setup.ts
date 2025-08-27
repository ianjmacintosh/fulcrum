import { test as setup, expect } from "@playwright/test";

const USER_EMAIL = process.env.USER_EMAIL || "";
const USER_PASSWORD = process.env.USER_PASSWORD || "";

// Note: We're calling this `setup` cause it's not test anything, but it's actually Playwright's `test` function
setup("Log in as the test user", async function loginAsUser({ page }) {
  await page.goto("/login");

  await page.getByLabel("Email Address").fill(USER_EMAIL);
  await page.getByLabel("Password").fill(USER_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait for successful login by checking for logout button
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
});
