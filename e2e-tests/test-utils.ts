import { Page, expect } from "@playwright/test";

const USER_EMAIL = process.env.USER_EMAIL || "";
const USER_PASSWORD = process.env.USER_PASSWORD || "";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

/**
 * Login as a regular user
 */
export async function loginAsUser(page: Page) {
  await page.goto("/login");

  await page.getByLabel("Email Address").fill(USER_EMAIL);
  await page.getByLabel("Password").fill(USER_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait for successful login by checking for logout button (more reliable than URL)
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
}

/**
 * Login as an admin user
 */
export async function loginAsAdmin(page: Page) {
  await page.goto("/login");

  await page.getByLabel("Email Address").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait for navigation to complete after login (admin goes to admin/users)
  await page.waitForURL("**/admin/**");
}

/**
 * Verify user is logged in (logout button is visible)
 */
export async function verifyLoggedIn(page: Page) {
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
}

/**
 * Verify user is not logged in (login link is visible)
 */
export async function verifyLoggedOut(page: Page) {
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
}

/**
 * Logout the current user
 */
export async function logout(page: Page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await verifyLoggedOut(page);
}
