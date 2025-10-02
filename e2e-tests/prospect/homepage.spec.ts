import { test, expect } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

test("Homepage loads", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Welcome to Fulcrum" }),
  ).toBeVisible();
});

test("Homepage styles load correctly", async ({ page }) => {
  await page.goto("/");

  const heading = page.getByRole("heading", { name: "Welcome to Fulcrum" });
  await expect(heading).toBeVisible();

  // Verify the h1 is using our specified font family
  const fontFamily = await heading.evaluate((el) => {
    return window.getComputedStyle(el).fontFamily;
  });

  expect(fontFamily).toBe(
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  );
});
