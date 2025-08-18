import { Page, expect } from '@playwright/test';

/**
 * Login as a regular user
 */
export async function loginAsUser(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.USER_EMAIL ?? '');
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.USER_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for navigation to complete after login
  await page.waitForURL('**/dashboard');
  
  // Wait for successful login (should show logout button)
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
}

/**
 * Login as an admin user
 */
export async function loginAsAdmin(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.ADMIN_EMAIL ?? '');
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.ADMIN_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for navigation to complete after login (admin goes to admin/users)
  await page.waitForURL('**/admin/**');
  
  // Wait for successful login (should show logout button)
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
}

/**
 * Verify user is logged in (logout button is visible)
 */
export async function verifyLoggedIn(page: Page) {
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
}

/**
 * Verify user is not logged in (login link is visible)
 */
export async function verifyLoggedOut(page: Page) {
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
}

/**
 * Logout the current user
 */
export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Logout' }).click();
  await verifyLoggedOut(page);
}