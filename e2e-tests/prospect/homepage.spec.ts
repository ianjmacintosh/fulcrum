import { test, expect } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

test("Homepage loads", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Welcome to Fulcrum" }),
  ).toBeVisible();
});
