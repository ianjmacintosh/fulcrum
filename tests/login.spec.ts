import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

test('Homepage has a login button and allows users to log in', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.USER_EMAIL ?? '');
  await page.getByRole('textbox', { name: 'Email Address' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.USER_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Expect the login to be successful
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
});