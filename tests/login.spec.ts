import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Fulcrum/);
});

test('get started link', async ({ page }) => {
  await page.goto('/');

  // Click the log in link.
  await page.getByRole('link', { name: 'Login' }).click();

  // Expects page to have a heading with the name of Sign In.
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});
