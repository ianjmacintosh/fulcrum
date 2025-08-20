import { test, expect } from '@playwright/test';
import { loginAsUser } from './test-utils';

test.describe('Application Details Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should load application details page from applications list', async ({ page }) => {
    // Navigate to applications page
    await page.goto('/applications');
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
    
    // Find and click the first application card
    const applicationCards = page.locator('.application-card-link');
    await expect(applicationCards.first()).toBeVisible();
    
    // Get the application card details before navigation
    const companyName = await applicationCards.first().locator('.company-name').textContent();
    const roleName = await applicationCards.first().locator('.role-name').textContent();
    const href = await applicationCards.first().getAttribute('href');
    
    console.log(`Clicking application: ${companyName} - ${roleName}`);
    console.log(`Link href: ${href}`);
    
    // Click on the first application card
    await applicationCards.first().click();
    
    // Fast navigation check - should complete within 3 seconds
    await page.waitForURL(/\/applications\/[a-f0-9]{24}\/details/, { timeout: 3000 });
    
    // Debug current state
    const currentUrl = page.url();
    const pageTitle = await page.title();
    const h1Content = await page.locator('h1').textContent();
    const notFoundVisible = await page.locator('text=Application not found').isVisible();
    const detailsVisible = await page.locator('text=Application Details').isVisible();
    
    console.log(`After navigation - URL: ${currentUrl}`);
    console.log(`Page title: ${pageTitle}`);
    console.log(`H1 content: ${h1Content}`);
    console.log(`"Application not found" visible: ${notFoundVisible}`);
    console.log(`"Application Details" visible: ${detailsVisible}`);
    
    // Verify the details page loads correctly within 2 seconds
    await expect(page.getByRole('heading', { name: 'Application Details' })).toBeVisible({ timeout: 2000 });
    
    // Verify we're NOT seeing an error message
    await expect(page.getByText('Application not found')).not.toBeVisible();
    
    // Verify the page shows the correct application data
    if (companyName) {
      await expect(page.getByRole('heading', { name: companyName })).toBeVisible();
    }
    if (roleName) {
      await expect(page.getByRole('heading', { name: roleName })).toBeVisible();
    }
    
    // Verify key page sections are present
    await expect(page.getByRole('heading', { name: 'Application Timeline' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Event' })).toBeVisible();
    
    // Verify application metadata section
    const metadata = page.locator('.application-metadata');
    await expect(metadata).toBeVisible();
    await expect(metadata.getByText('Application Type:')).toBeVisible();
    await expect(metadata.getByText('Role Type:')).toBeVisible();
    await expect(metadata.getByText('Location:')).toBeVisible();
    await expect(metadata.getByText('Current Status:')).toBeVisible();
    
    // Verify timeline table is present and has data
    const timelineTable = page.locator('.timeline-table');
    await expect(timelineTable).toBeVisible();
    await expect(timelineTable.locator('thead th').first()).toContainText('Date');
    await expect(timelineTable.locator('thead th').nth(1)).toContainText('Event');
    await expect(timelineTable.locator('thead th').nth(2)).toContainText('Description');
    
    // Verify there's at least one event in the timeline
    const timelineRows = timelineTable.locator('tbody tr');
    await expect(timelineRows.first()).toBeVisible();
  });

  test('should handle direct navigation to application details URL', async ({ page }) => {
    // First get a valid application ID by going to the applications page
    await page.goto('/applications');
    await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
    
    const firstCard = page.locator('.application-card-link').first();
    await expect(firstCard).toBeVisible();
    
    // Extract the application ID from the href attribute
    const href = await firstCard.getAttribute('href');
    expect(href).toMatch(/\/applications\/[a-f0-9]{24}\/details/);
    
    // Navigate directly to the details URL
    await page.goto(href!);
    
    // Should load quickly and correctly
    await expect(page.getByRole('heading', { name: 'Application Details' })).toBeVisible({ timeout: 2000 });
    await expect(page.getByText('Application not found')).not.toBeVisible();
    
    // Verify essential page elements
    await expect(page.getByRole('heading', { name: 'Application Timeline' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Event' })).toBeVisible();
  });

  test('should show error for invalid application ID', async ({ page }) => {
    // Try to navigate to a non-existent application
    await page.goto('/applications/000000000000000000000000/details');
    
    // Should show the "Application not found" message quickly
    await expect(page.getByText('Application not found')).toBeVisible({ timeout: 2000 });
    
    // Should NOT show the normal application details content
    await expect(page.getByText('Application Timeline')).not.toBeVisible();
    await expect(page.getByText('Add Event')).not.toBeVisible();
  });

  test('should handle navigation back to applications list', async ({ page }) => {
    // Navigate to applications page
    await page.goto('/applications');
    await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
    
    // Click on first application
    const firstCard = page.locator('.application-card-link').first();
    await firstCard.click();
    
    // Wait for details page
    await expect(page.getByRole('heading', { name: 'Application Details' })).toBeVisible({ timeout: 2000 });
    
    // Navigate back using browser back button
    await page.goBack();
    
    // Should be back on applications list
    await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible({ timeout: 2000 });
    await expect(page.locator('.application-card').first()).toBeVisible();
  });
});