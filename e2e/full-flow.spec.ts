import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/**
 * Full flow: create pool, admin distributes/assigns, players join and claim.
 */
test.describe("Full flow", () => {
	test("admin creates pool, players claim, distribute, assign numbers, board complete", async ({
		page,
		request,
		browser,
	}) => {
		test.setTimeout(10_000);

		// 1. Create pool via API
		const res = await request.post("/api/pools", {
			data: {
				title: "Full Flow E2E Pool",
				adminEmail: "e2e-full@example.com",
				maxSquaresPerPerson: 10,
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

		// 2. Admin: dev-admin sets cookie and redirects to /go/slug
		await page.goto(`/api/auth/dev-admin?slug=${slug}`);
		await expect(page).toHaveURL(new RegExp(`/go/${slug}`));
		await expect(page.getByTestId("admin-board")).toBeVisible({
			timeout: 45000,
		});

		// Helper: join as player and claim 10 squares (one full row)
		const joinAndClaimRow = async (
			playerPage: Page,
			playerName: string,
			row: number,
		) => {
			await playerPage.goto(`/play/${slug}`);
			await expect(playerPage.getByTestId("play-player-name")).toBeVisible({
				timeout: 15000,
			});
			await playerPage.getByTestId("play-player-name").fill(playerName);
			await playerPage.getByTestId("play-join-button").click();
			for (let col = 1; col <= 10; col++) {
				const btn = playerPage.getByRole("button", {
					name: `Empty square at row ${row}, column ${col}`,
					exact: true,
				});
				await expect(btn).toBeVisible({ timeout: 5000 });
				await btn.click();
			}
		};

		// 3. Three player contexts: each joins and claims 10 squares (rows 1, 2, 3 = 30 total)
		const ctx1 = await browser.newContext();
		const ctx2 = await browser.newContext();
		const ctx3 = await browser.newContext();
		const p1 = await ctx1.newPage();
		const p2 = await ctx2.newPage();
		const p3 = await ctx3.newPage();

		await joinAndClaimRow(p1, "Player 1", 1);
		await joinAndClaimRow(p2, "Player 2", 2);
		await joinAndClaimRow(p3, "Player 3", 3);

		// 4. Admin: Distribute remaining 70 squares
		await page.bringToFront();
		await expect(
			page.getByRole("button", {
				name: /Distribute \d+ Remaining Squares to Players/i,
			}),
		).toBeVisible({ timeout: 5000 });
		await page
			.getByRole("button", {
				name: /Distribute \d+ Remaining Squares to Players/i,
			})
			.click();
		await page.getByRole("button", { name: "Yes, Distribute Squares" }).click();
		// Wait for distribute to finish: Distribute button disappears (open count 0)
		await expect(
			page.getByRole("button", {
				name: /Distribute \d+ Remaining Squares to Players/i,
			}),
		).not.toBeVisible({ timeout: 15000 });
		await expect(page.getByText("/ 100 claimed")).toBeVisible();

		// 5. Admin: Assign numbers (board full, no confirm dialog)
		await page.getByRole("button", { name: "Assign Random Numbers" }).click();
		await expect(page.getByText("Numbers have been assigned")).toBeVisible({
			timeout: 10000,
		});

		// 6. Player view: reload and assert board full + numbers assigned (no "waiting for numbers" banner)
		await p1.bringToFront();
		await p1.reload();
		await expect(
			p1.getByText("Board is full! Waiting for admin to assign numbers."),
		).not.toBeVisible({ timeout: 15000 });
		await expect(
			p1.getByRole("button", {
				name: "Empty square at row 1, column 1",
				exact: true,
			}),
		).not.toBeVisible();
		await expect(
			p1
				.getByRole("button", {
					name: "Square claimed by Player 1",
					exact: true,
				})
				.first(),
		).toBeVisible({ timeout: 5000 });

		await page.pause();

		await ctx1.close();
		await ctx2.close();
		await ctx3.close();
	});
});
