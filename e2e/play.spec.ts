import { expect, test } from "@playwright/test";

test.describe("Play", () => {
	test("unknown slug shows pool not found", async ({ page }) => {
		await page.goto("/play/nonexistent-slug-12345");
		// Wait for Convex query to resolve and not-found view to render
		await expect(page.getByTestId("play-not-found-heading")).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByRole("link", { name: /Homepage/i })).toBeVisible();
	});

	test("full flow: create pool, open play, join, claim a square", async ({
		page,
		request,
	}) => {
		// Create pool via API (requires Convex dev + NEXT_PUBLIC_CONVEX_URL in .env.local)
		const res = await request.post("/api/pools", {
			data: {
				title: "E2E Play Pool",
				adminEmail: "e2e-play@example.com",
				maxSquaresPerPerson: 5,
			},
		});

		const body = (await res.json().catch(() => ({}))) as { slug?: string };
		if (!res.ok()) {
			test.skip(true, `Create pool API failed (${res.status()}): run with \`pnpm dev\` and Convex configured`);
			return;
		}
		const slug = body.slug;
		expect(slug).toBeTruthy();

		await page.goto(`/play/${slug}`);

		// Wait for join form
		await expect(page.getByTestId("play-player-name")).toBeVisible({
			timeout: 15000,
		});
		await page.getByTestId("play-player-name").fill("E2E Player");
		await page.getByTestId("play-join-button").click();

		// After join we see the grid; wait for an empty square and click it
		const emptySquare = page.getByRole("button", {
			name: "Empty square at row 1, column 1",
			exact: true,
		});
		await expect(emptySquare).toBeVisible({ timeout: 10000 });
		await emptySquare.click();

		// Square should become claimed (by E2E Player)
		await expect(
			page.getByRole("button", { name: /claimed by E2E Player/i }),
		).toBeVisible({ timeout: 5000 });
	});
});
