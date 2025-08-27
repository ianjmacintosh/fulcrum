import { defineConfig, devices } from "@playwright/test";

import dotenv from "dotenv";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export const USER_STORAGE_STATE = path.join(
  __dirname,
  "playwright/.auth/user.json",
);
// const ADMIN_STORAGE_STATE = "playwright/.auth/admin.json";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e-tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  workers: 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "list",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "prospective user tests",
      testMatch: "**/prospect/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "user setup",
      testMatch: "**/user/*.setup.ts",
    },
    {
      name: "user tests",
      testMatch: "**/user/*.spec.ts",
      dependencies: ["user setup"],
      use: { ...devices["Desktop Chrome"], storageState: USER_STORAGE_STATE },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
