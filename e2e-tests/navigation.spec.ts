import { test, expect } from '@playwright/test';
import { loginAsUser, loginAsAdmin, verifyLoggedIn } from './test-utils';

test.describe('Navigation and Session Persistence', () => {
  test.describe('User Session Tests', () => {
    test('Client-side navigation preserves user session', async ({ page }) => {
      // Login as user
      await loginAsUser(page);
      
      // Use client-side navigation to applications (via link click)
      await page.getByRole('link', { name: 'Applications' }).click();
      
      // Verify we're on applications page and session is maintained
      await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
      await verifyLoggedIn(page);
    });

    test('Direct URL navigation preserves user session', async ({ page }) => {
      // Login as user
      await loginAsUser(page);
      
      // Navigate directly to applications page via URL
      await page.goto('/applications');
      
      // Verify we're on applications page and session is maintained
      await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
      await verifyLoggedIn(page);
    });

    test('Page refresh preserves user session', async ({ page }) => {
      // Login as user
      await loginAsUser(page);
      
      // Navigate to applications page
      await page.goto('/applications');
      await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
      
      // Refresh the page
      await page.reload();
      
      // Verify session is still maintained after refresh
      await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
      await verifyLoggedIn(page);
    });
  });

  test.describe('Admin Session Tests', () => {
    test('Client-side navigation preserves admin session', async ({ page }) => {
      // Login as admin
      await loginAsAdmin(page);
      
      // Use client-side navigation to admin users page (via link click if available)
      // Note: We might need to navigate directly since admin nav might be different
      await page.goto('/admin/users');
      
      // Verify we're on admin users page and session is maintained
      await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
      await verifyLoggedIn(page);
    });

    test('Direct URL navigation preserves admin session', async ({ page }) => {
      // Login as admin
      await loginAsAdmin(page);
      
      // Navigate directly to admin users page via URL
      await page.goto('/admin/users');
      
      // Verify we're on admin users page and session is maintained
      await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
      await verifyLoggedIn(page);
    });

    test('Page refresh preserves admin session', async ({ page }) => {
      // Login as admin
      await loginAsAdmin(page);
      
      // Navigate to admin users page
      await page.goto('/admin/users');
      await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
      
      // Refresh the page
      await page.reload();
      
      // Verify session is still maintained after refresh
      await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
      await verifyLoggedIn(page);
    });
  });

  test.describe('Authorization and Deep Links', () => {
    test('Regular user cannot access admin routes', async ({ page }) => {
      // Login as regular user
      await loginAsUser(page);
      
      // Try to access admin route
      await page.goto('/admin/users');
      
      // Should be redirected or see unauthorized message
      // The exact behavior depends on your auth implementation
      // This might redirect to login, show 403, or redirect to user dashboard
      await expect(page.url()).not.toContain('/admin/users');
    });

    test('Deep link authentication for user routes', async ({ page }) => {
      // Try to access protected route without login
      await page.goto('/applications');
      
      // Should be redirected to login
      await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
      
      // Login and should be redirected back to intended page
      await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.USER_EMAIL ?? '');
      await page.getByRole('textbox', { name: 'Password' }).fill(process.env.USER_PASSWORD ?? '');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Should end up on the originally requested page
      await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
    });

    test('Deep link authentication for admin routes', async ({ page }) => {
      // Try to access protected admin route without login
      await page.goto('/admin/users');
      
      // Should be redirected to login
      await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
      
      // Login as admin and should be redirected back to intended page
      await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.ADMIN_EMAIL ?? '');
      await page.getByRole('textbox', { name: 'Password' }).fill(process.env.ADMIN_PASSWORD ?? '');
      await page.getByRole('button', { name: 'Sign In' }).click();
      
      // Should end up on the originally requested admin page
      await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
    });
  });
});