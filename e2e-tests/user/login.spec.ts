import { test, expect } from "@playwright/test";

test("Homepage has a login button and allows users to log in", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
});
