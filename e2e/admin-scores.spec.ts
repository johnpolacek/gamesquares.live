import { expect, test } from "@playwright/test";

test.describe("Global scores admin", () => {
	test("admin scores page loads and shows form", async ({ page }) => {
		await page.goto("/admin/scores");
		await expect(
			page.getByRole("heading", { name: /Global Game Scores/i }),
		).toBeVisible({ timeout: 15000 });
		await expect(page.getByLabel(/Passcode/i)).toBeVisible();
		await expect(page.getByLabel(/Game name/i)).toBeVisible();
		await expect(page.getByRole("button", { name: /Save scores/i })).toBeVisible();
	});

	test("submit with wrong passcode shows error", async ({ page }) => {
		await page.goto("/admin/scores");
		await page.getByLabel(/Passcode/i).fill("wrong-passcode");
		await page.getByRole("button", { name: /Save scores/i }).click();
		await expect(page.getByText(/Unauthorized|error/i)).toBeVisible({
			timeout: 5000,
		});
	});
});
