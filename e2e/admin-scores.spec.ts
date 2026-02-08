import { expect, test } from "@playwright/test";

const ADMIN_SECRET = process.env.GLOBAL_ADMIN_SECRET ?? "e2e-test-secret";

test.describe("Global scores admin", () => {
	test("admin scores page loads and shows form", async ({ page }) => {
		await page.goto("/admin");
		// Authenticate first
		await expect(
			page.getByRole("heading", { name: /Admin/i }),
		).toBeVisible({ timeout: 15000 });
		await expect(page.getByLabel(/Admin Passcode/i)).toBeVisible();
		await page.getByLabel(/Admin Passcode/i).fill(ADMIN_SECRET);
		await page.getByRole("button", { name: /Sign In/i }).click();
		// After auth, the scores form should be visible
		await expect(page.getByLabel(/Game name/i)).toBeVisible({ timeout: 15000 });
		await expect(page.getByRole("button", { name: /Save scores/i })).toBeVisible();
	});

	test("submit with wrong passcode shows error", async ({ page }) => {
		await page.goto("/admin");
		await expect(page.getByLabel(/Admin Passcode/i)).toBeVisible({
			timeout: 15000,
		});
		await page.getByLabel(/Admin Passcode/i).fill("wrong-passcode");
		await page.getByRole("button", { name: /Sign In/i }).click();
		await expect(page.getByText(/Invalid passcode|Unauthorized|error/i)).toBeVisible({
			timeout: 5000,
		});
	});
});
