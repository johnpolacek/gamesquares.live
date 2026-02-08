import { expect, test } from "@playwright/test";

test.describe("Landing", () => {
	test("homepage loads and shows create pool CTA", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByTestId("landing-create-pool-cta")).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByText("GameSquares", { exact: true })).toBeVisible();
	});

	test("create pool flow: configure and submit shows success", async ({
		page,
	}) => {
		await page.goto("/");
		// Clear any prior pool creation so we see the hero CTA
		await page.evaluate(() => {
			localStorage.removeItem("gamesquares_pool_created_at");
			localStorage.removeItem("gamesquares_created_pool_slug");
			localStorage.removeItem("gamesquares_dev_pool_link");
		});
		await page.reload();

		await page.getByTestId("landing-create-pool-cta").click();

		await expect(
			page.getByRole("heading", { name: /Set up your pool/i }),
		).toBeVisible();
		await page.getByLabel(/Pool title/i).fill("E2E Test Pool");
		await page.getByLabel(/Your email/i).fill("e2e@example.com");
		await page.getByRole("button", { name: "5" }).click();
		await page.getByTestId("landing-create-pool-submit").click();

		await expect(
			page.getByTestId("landing-success-heading"),
		).toBeVisible({ timeout: 20000 });
		// In development the API returns poolLink and we show "Dev bypass"
		const playLink = page.locator('a[href*="/play/"]').first();
		await expect(playLink).toBeVisible({ timeout: 5000 });
	});
});
