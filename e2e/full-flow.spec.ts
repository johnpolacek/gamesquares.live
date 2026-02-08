import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/**
 * Full flow: create pool, admin distributes/assigns, players join and claim,
 * then play through all 4 quarters using the admin scores UI and verify winner display.
 */

const ADMIN_SECRET = "e2e-test-secret";

test.describe("Full flow", () => {
	test("admin creates pool, players claim, distribute, assign numbers, play full game", async ({
		page,
		request,
		browser,
	}) => {
		test.setTimeout(120_000);

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

		// 6. Player view: reload and assert board full + numbers assigned
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

		// ================================================================
		// 7. GAME: Play through all 4 quarters via admin scores UI
		// ================================================================

		// Open the admin scores page once; form state persists between submissions
		await page.bringToFront();
		await page.goto("/admin/scores");
		await expect(
			page.getByRole("heading", { name: /Global Game Scores/i }),
		).toBeVisible({ timeout: 15000 });

		// Wait for Convex data to load before filling the form, otherwise the
		// useEffect that syncs existing game data can overwrite our inputs.
		await expect(
			page.getByText("Live Game").or(page.getByText("No game has been set")),
		).toBeVisible({ timeout: 15000 });

		// Reset the form to clear any stale state from previous runs
		await page.getByRole("button", { name: "Reset to zeros" }).click();

		// Fill game name and passcode (only need to do this once)
		await page.getByLabel(/Game name/i).clear();
		await page.getByLabel(/Game name/i).fill("Super Bowl LIX");
		await page.getByLabel(/Passcode/i).fill(ADMIN_SECRET);

		// Helper: update scores on the admin form and submit (form state persists)
		// Handles the "Update live game?" confirmation dialog when overwriting existing scores.
		const updateScore = async (
			q: string,
			rowScore: string,
			colScore: string,
		) => {
			await page.bringToFront();
			await page.locator(`#${q}-row`).fill(rowScore);
			await page.locator(`#${q}-col`).fill(colScore);
			await page.getByRole("button", { name: /Save scores/i }).click();
			// If a confirmation dialog appears (overwriting live game), click Continue
			const continueBtn = page.getByRole("button", { name: "Continue" });
			if (await continueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
				await continueBtn.click();
			}
			await expect(page.getByText("Scores updated.")).toBeVisible({
				timeout: 10000,
			});
		};

		// Helper: mark a quarter complete on the form
		const markQuarterComplete = async (q: string) => {
			await page.bringToFront();
			await page.locator(`#${q}-complete`).check();
		};

		// Helper: check player view shows expected score text
		const expectPlayerScore = async (pattern: RegExp) => {
			await p1.bringToFront();
			await p1.reload();
			await expect(p1.getByText(pattern)).toBeVisible({ timeout: 10000 });
		};

		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Q1: Eagles FG (0-3), then Eagles TD+XP (0-10), then Eagles TD+XP (0-17)
		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

		// Eagles kick a field goal: 0-3
		await updateScore("Q1", "0", "3");
		await expectPlayerScore(/Q1: 0–3/);
		await expect(p1.getByText(/currently winning/)).toBeVisible({
			timeout: 10000,
		});

		// ================================================================
		// VIEW PAGE: Verify big-screen scoreboard mid-game
		// ================================================================
		const viewCtx = await browser.newContext();
		const viewPage = await viewCtx.newPage();
		await viewPage.goto(`/view/${slug}`);
		await expect(viewPage.getByTestId("view-scoreboard")).toBeVisible({
			timeout: 15000,
		});

		// Should show the game name and live badge
		await expect(viewPage.getByText("Super Bowl LIX")).toBeVisible({
			timeout: 10000,
		});
		await expect(viewPage.getByText("Live", { exact: true })).toBeVisible({
			timeout: 10000,
		});

		// Should show current score (0 - 3) — wait for Convex real-time to sync
		await expect(viewPage.getByTestId("view-home-score")).toHaveText("0", {
			timeout: 10000,
		});
		await expect(viewPage.getByTestId("view-away-score")).toHaveText("3", {
			timeout: 10000,
		});

		// Should show "Next Score Wins" what-if scenarios
		await expect(viewPage.getByTestId("view-what-if")).toBeVisible({
			timeout: 10000,
		});
		await expect(viewPage.getByText("Patriots FG")).toBeVisible({
			timeout: 10000,
		});
		await expect(viewPage.getByText("Patriots TD")).toBeVisible({
			timeout: 10000,
		});
		await expect(viewPage.getByText("Seahawks FG")).toBeVisible({
			timeout: 10000,
		});
		await expect(viewPage.getByText("Seahawks TD")).toBeVisible({
			timeout: 10000,
		});

		// Eagles score a touchdown + extra point: 0-10
		await updateScore("Q1", "0", "10");
		await expectPlayerScore(/Q1: 0–10/);

		// Eagles score another TD+XP: 0-17
		await updateScore("Q1", "0", "17");
		await expectPlayerScore(/Q1: 0–17/);

		// End of Q1: mark complete, start Q2
		await markQuarterComplete("Q1");

		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Q2: Chiefs TD+XP (7-17), Chiefs FG (10-17), Eagles FG (10-20), Chiefs TD+XP (17-20)
		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

		// Chiefs answer with a TD+XP: 7-17
		await updateScore("Q2", "7", "17");
		await expectPlayerScore(/Q2: 7–17/);
		await expect(p1.getByText(/Q1.*winner:/)).toBeVisible({ timeout: 10000 });
		await expect(p1.getByText(/Q2.*currently winning/)).toBeVisible({ timeout: 10000 });

		// Chiefs FG: 10-17
		await updateScore("Q2", "10", "17");
		await expectPlayerScore(/Q2: 10–17/);

		// Eagles FG: 10-20
		await updateScore("Q2", "10", "20");
		await expectPlayerScore(/Q2: 10–20/);

		// Chiefs TD+XP before halftime: 17-20
		await updateScore("Q2", "17", "20");
		await expectPlayerScore(/Q2: 17–20/);

		// End of Q2 (halftime): mark complete
		await markQuarterComplete("Q2");

		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Q3: Chiefs TD+XP (24-20), Eagles FG (24-23)
		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

		// Chiefs come out strong, TD+XP: 24-20
		await updateScore("Q3", "24", "20");
		await expectPlayerScore(/Q3: 24–20/);
		await expect(p1.getByText(/Q2.*winner:/)).toBeVisible({ timeout: 10000 });
		await expect(p1.getByText(/Q3.*currently winning/)).toBeVisible({ timeout: 10000 });

		// Eagles FG: 24-23
		await updateScore("Q3", "24", "23");
		await expectPlayerScore(/Q3: 24–23/);

		// End of Q3: mark complete
		await markQuarterComplete("Q3");

		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		// Q4: Eagles TD+2pt (24-31), Chiefs FG (27-31), Chiefs TD+XP (34-31), Eagles FG (34-34)
		// Then Eagles TD+XP for the win (34-41)
		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

		// Eagles TD + 2pt conversion: 24-31
		await updateScore("Q4", "24", "31");
		await expectPlayerScore(/Q4: 24–31/);
		await expect(p1.getByText(/Q3.*winner:/)).toBeVisible({ timeout: 10000 });
		await expect(p1.getByText(/Q4.*currently winning/)).toBeVisible({ timeout: 10000 });

		// Chiefs FG: 27-31
		await updateScore("Q4", "27", "31");
		await expectPlayerScore(/Q4: 27–31/);

		// Chiefs TD+XP to take the lead: 34-31
		await updateScore("Q4", "34", "31");
		await expectPlayerScore(/Q4: 34–31/);

		// Eagles FG to tie: 34-34
		await updateScore("Q4", "34", "34");
		await expectPlayerScore(/Q4: 34–34/);

		// Eagles TD+XP for the win!: 34-41
		await updateScore("Q4", "34", "41");
		await expectPlayerScore(/Q4: 34–41/);

		// --- Mark Q4 complete and game complete ---
		await markQuarterComplete("Q4");
		await page.bringToFront();
		await page.locator("#game-complete").check();
		await page.getByRole("button", { name: /Save scores/i }).click();
		// Handle confirmation dialog if it appears
		const finalContinueBtn = page.getByRole("button", { name: "Continue" });
		if (await finalContinueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
			await finalContinueBtn.click();
		}
		await expect(page.getByText("Scores updated.")).toBeVisible({
			timeout: 10000,
		});

		// Player view: game complete → all show "winner", last quarter is "FINAL"
		await p1.bringToFront();
		await p1.reload();
		await expect(p1.getByText(/Q1.*0–17.*winner:/)).toBeVisible({
			timeout: 10000,
		});
		await expect(p1.getByText(/Q2.*17–20.*winner:/)).toBeVisible({
			timeout: 10000,
		});
		await expect(p1.getByText(/Q3.*24–23.*winner:/)).toBeVisible({
			timeout: 10000,
		});
		await expect(p1.getByText(/FINAL: 34–41.*winner:/)).toBeVisible({
			timeout: 10000,
		});

		// Verify final state on all player pages
		await p2.bringToFront();
		await p2.reload();
		await expect(p2.getByText("Super Bowl LIX")).toBeVisible({
			timeout: 10000,
		});
		await expect(p2.getByText(/FINAL: 34–41/)).toBeVisible({
			timeout: 10000,
		});

		await p3.bringToFront();
		await p3.reload();
		await expect(p3.getByText("Super Bowl LIX")).toBeVisible({
			timeout: 10000,
		});
		await expect(p3.getByText(/FINAL: 34–41/)).toBeVisible({
			timeout: 10000,
		});

		// Admin view: navigate back to admin board and verify it's still showing the pool
		await page.bringToFront();
		await page.goto(`/go/${slug}`);
		await expect(page.getByTestId("admin-board")).toBeVisible({
			timeout: 15000,
		});
		await expect(page.getByText("/ 100 claimed")).toBeVisible({
			timeout: 10000,
		});

		// ================================================================
		// VIEW PAGE: Verify big-screen scoreboard after game complete
		// ================================================================
		await viewPage.bringToFront();
		await viewPage.reload();
		await expect(viewPage.getByTestId("view-scoreboard")).toBeVisible({
			timeout: 15000,
		});

		// Should show Final badge (no Live badge)
		await expect(viewPage.getByText("Final").first()).toBeVisible({
			timeout: 10000,
		});

		// Should show final scores
		await expect(viewPage.getByTestId("view-home-score")).toHaveText("34", {
			timeout: 10000,
		});
		await expect(viewPage.getByTestId("view-away-score")).toHaveText("41", {
			timeout: 10000,
		});

		// Quarter scores panel should show all quarters with winners
		await expect(viewPage.getByTestId("view-quarter-scores")).toBeVisible({
			timeout: 10000,
		});

		// "Next Score Wins" should NOT be visible when game is complete
		await expect(viewPage.getByTestId("view-what-if")).not.toBeVisible({
			timeout: 10000,
		});

		await viewCtx.close();
		await ctx1.close();
		await ctx2.close();
		await ctx3.close();
	});
});
