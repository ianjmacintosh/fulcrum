import { test } from '@playwright/test';
import { loginAsUser, loginAsAdmin } from './test-utils';

test('Homepage has a login button and allows users to log in', async ({ page }) => {
  await loginAsUser(page);
});

test('Homepage has a login button and allows administrators to log in', async ({ page }) => {
  await loginAsAdmin(page);
});