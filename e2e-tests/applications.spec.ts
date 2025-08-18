import { test, expect } from '@playwright/test';
import { loginAsUser } from './test-utils';

test('Applications page loads and displays job applications', async ({ page }) => {
  // Log in first
  await loginAsUser(page);

  // Navigate to applications page
  await page.goto('/applications');

  // Check that the applications page loads
  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
  await expect(page.getByText('Track all applications and update job status throughout the process')).toBeVisible();

  // Check that the summary stats are displayed
  await expect(page.getByText('Total Applications')).toBeVisible();
  await expect(page.getByText('Open Applications')).toBeVisible();
  await expect(page.getByText('Closed/Rejected')).toBeVisible();

  // Check that the add new application button is present
  await expect(page.getByRole('link', { name: '+ Add New Application' })).toBeVisible();
});

test('Applications page displays application cards when data exists', async ({ page }) => {
  // Log in first
  await loginAsUser(page);

  // Navigate to applications page
  await page.goto('/applications');

  // Wait for the page to load
  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();

  // Check if there are application cards OR the no applications message
  const hasApplicationCards = await page.locator('.application-card').count() > 0;
  const hasNoApplicationsMessage = await page.locator('.no-applications').isVisible();

  // Either there should be application cards OR a "No Job Applications" message
  expect(hasApplicationCards || hasNoApplicationsMessage).toBe(true);

  // If there are application cards, verify they have the expected structure
  if (hasApplicationCards) {
    const firstCard = page.locator('.application-card').first();
    await expect(firstCard).toBeVisible();

    // Each card should have a company name and role
    await expect(firstCard.locator('.company-name')).toBeVisible();
    await expect(firstCard.locator('.role-name')).toBeVisible();
    await expect(firstCard.locator('.status-badge')).toBeVisible();
  }
});

test('Add New Application button navigates to the correct page', async ({ page }) => {
  // Log in first
  await loginAsUser(page);

  // Navigate to applications page
  await page.goto('/applications');

  // Click on Add New Application
  await page.getByRole('link', { name: '+ Add New Application' }).click();

  // Verify we're on the new application page
  expect(page.url()).toContain('/applications/new');
});