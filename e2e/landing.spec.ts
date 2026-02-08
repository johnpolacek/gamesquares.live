import { expect, test } from "@playwright/test";

test.describe("Landing", () => {
	test("homepage loads and shows create pool CTA", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByTestId("landing-create-pool-cta")).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByRole("heading", { name: /GameSquares/i })).toBeVisible();
	});

	test("create pool flow: configure and submit shows success", async ({
		page,
	}) => {
		await page.goto("/");
		// Clear any prior pool creation so we see the hero CTA
		await page.evaluate(() => {
			localStorage.removeItem("gamesquares_pool_created_at");
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

	test("sponsor CTA appears when pool creation returns 429", async ({
		page,
	}) => {
		await page.goto("/");
		// Clear any prior pool creation
		await page.evaluate(() => {
			localStorage.removeItem("gamesquares_pool_created_at");
			localStorage.removeItem("gamesquares_dev_pool_link");
		});
		await page.reload();

		// Mock /api/pools to return 429 (rate limit)
		await page.route("**/api/pools", (route) =>
			route.fulfill({
				status: 429,
				contentType: "application/json",
				body: JSON.stringify({
					error: "Pool creation limit reached. Try again later.",
				}),
			}),
		);

		// Mock /api/sponsor/config to return sponsor info
		await page.route("**/api/sponsor/config", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ poolsCount: 100, displayPrice: "$5" }),
			}),
		);

		// Navigate to configure step
		await page.getByTestId("landing-create-pool-cta").click();
		await expect(
			page.getByRole("heading", { name: /Set up your pool/i }),
		).toBeVisible();

		// Fill form and submit
		await page.getByLabel(/Pool title/i).fill("Rate Limited Pool");
		await page.getByLabel(/Your email/i).fill("limited@example.com");
		await page.getByTestId("landing-create-pool-submit").click();

		// Verify error message and sponsor CTA appear
		await expect(
			page.getByText("Pool creation limit reached. Try again later."),
		).toBeVisible({ timeout: 5000 });
		await expect(page.getByTestId("sponsor-cta")).toBeVisible();
		await expect(page.getByTestId("sponsor-cta")).toContainText(
			"Unlock the next 100",
		);
		await expect(page.getByTestId("sponsor-cta")).toContainText("$5");
	});
});
