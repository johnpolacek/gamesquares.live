import { expect, test } from "@playwright/test";

/**
 * Play page tests. Skipped by default: they need Convex client to resolve in the browser,
 * which often doesn’t happen under Playwright’s webServer. Run manually with `pnpm dev` then
 * `pnpm exec playwright test e2e/play.spec.ts` to run these.
 */
test.describe("Play", () => {
	test.beforeAll(async ({ browser }) => {
		const page = await browser.newPage();
		await page.goto("/");
		await page
			.getByTestId("landing-create-pool-cta")
			.waitFor({ state: "visible", timeout: 15000 });
		await page.close();
	});

	test("unknown slug shows pool not found", async ({ page }) => {
		test.setTimeout(10000);
		await page.goto("/play/nonexistent-slug-12345");
		await expect(page.getByTestId("play-not-found-heading")).toBeVisible({
			timeout: 45000,
		});
		await expect(page.getByRole("link", { name: /Homepage/i })).toBeVisible();
	});

	test("full flow: create pool, open play, join, claim a square", async ({
		page,
		request,
	}) => {
		test.setTimeout(10000);
		const res = await request.post("/api/pools", {
			data: {
				title: "E2E Play Pool",
				adminEmail: "e2e-play@example.com",
				maxSquaresPerPerson: 5,
			},
		});

		const body = (await res.json().catch(() => ({}))) as { slug?: string };
		if (!res.ok()) {
			test.skip(
				true,
				`Create pool API failed (${res.status()}): run with \`pnpm dev\` and Convex configured`,
			);
			return;
		}
		const slug = body.slug;
		expect(slug).toBeTruthy();

		await page.goto(`/play/${slug}`);
		await expect(page.getByTestId("play-player-name")).toBeVisible({
			timeout: 45000,
		});
		await page.getByTestId("play-player-name").fill("E2E Player");
		await page.getByTestId("play-join-button").click();

		// After join we see the grid; wait for an empty square and click it
		const emptySquare = page.getByRole("button", {
			name: "Empty square at row 1, column 1",
			exact: true,
		});
		await expect(emptySquare).toBeVisible({ timeout: 15000 });
		await emptySquare.click();

		// Square should become claimed (by E2E Player)
		await expect(
			page.getByRole("button", { name: /claimed by E2E Player/i }),
		).toBeVisible({ timeout: 5000 });
	});
});
