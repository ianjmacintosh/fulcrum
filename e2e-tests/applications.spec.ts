import { test, expect } from '@playwright/test';
import { loginAsUser } from './test-utils';

test.describe.serial('Applications', () => {

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
  
  // Verify we're logged in by checking for the logout button
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

  // Navigate to applications page
  await page.goto('/applications');

  // Wait for authentication state to be fully loaded after navigation
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

  // Wait for the page to be fully loaded before clicking the button
  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
  
  // Wait for the Add New Application button to be visible
  await expect(page.getByRole('link', { name: '+ Add New Application' })).toBeVisible();

  // Click on Add New Application
  await page.getByRole('link', { name: '+ Add New Application' }).click();

  // Verify we're on the new application page
  expect(page.url()).toContain('/applications/new');
});

test('Application cards navigate to details page correctly', async ({ page }) => {
  // Log in first
  await loginAsUser(page);

  // Navigate to applications page
  await page.goto('/applications');

  // Wait for the page to load
  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();

  // Wait for application cards to load - they should be there since seed data exists
  await expect(page.locator('.application-card-link').first()).toBeVisible({ timeout: 10000 });
  
  // Verify we don't see "No applications" message since seed data should exist
  await expect(page.locator('.no-applications')).not.toBeVisible();
  
  // Get the first application card
  const firstCard = page.locator('.application-card-link').first();
  
  // Verify the card has required elements
  await expect(firstCard.locator('.company-name')).toBeVisible();
  await expect(firstCard.locator('.role-name')).toBeVisible();
  
  // Click on the first application card
  await firstCard.click();

  // Wait for navigation (should be fast - 5 seconds max)
  await page.waitForURL(/\/applications\/[a-f0-9]{24}\/details/, { timeout: 5000 });

  // Verify we're on the details page
  await expect(page.getByRole('heading', { name: 'Application Details' })).toBeVisible({ timeout: 5000 });
  
  // Verify the page shows application content, not an error
  await expect(page.getByText('Application not found')).not.toBeVisible();
  
  // Verify key sections are present
  await expect(page.getByRole('heading', { name: 'Application Timeline' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Add Event' })).toBeVisible();
});

}); // Close test.describe.serial