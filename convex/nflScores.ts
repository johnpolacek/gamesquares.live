"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const ESPN_SCOREBOARD_URL =
	"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

type Quarter = { label: string; rowTeamScore: number; colTeamScore: number };

/**
 * Fetch NFL scoreboard from ESPN, find the Super Bowl (week 5 postseason or name),
 * and update the global game with current quarter scores.
 * Uses total score and period to build quarters (cumulative at end of each period).
 */
export const fetchAndUpdateScores = action({
	args: {},
	returns: v.union(
		v.object({ updated: v.literal(true), quarters: v.number() }),
		v.object({ updated: v.literal(false), reason: v.string() }),
	),
	handler: async (ctx) => {
		const res = await fetch(ESPN_SCOREBOARD_URL);
		if (!res.ok) {
			throw new Error(`ESPN scoreboard failed: ${res.status}`);
		}
		const data = (await res.json()) as {
			events?: Array<{
				id: string;
				name: string;
				competitions?: Array<{
					competitors?: Array<{
						homeAway: string;
						score: string;
						team?: { abbreviation: string };
					}>;
				}>;
				status?: { period?: number };
			}>;
		};

		const events = data.events ?? [];
		const event = events.find(
			(e) =>
				e.name?.toLowerCase().includes("super bowl") ||
				e.name?.toLowerCase().includes("patriots") ||
				e.name?.toLowerCase().includes("seahawks"),
		) ?? events[0];

		if (!event?.competitions?.[0]?.competitors?.length) {
			return { updated: false as const, reason: "no game found" };
		}

		const comp = event.competitions[0];
		const competitors = comp.competitors ?? [];
		const home = competitors.find((c) => c.homeAway === "home");
		const away = competitors.find((c) => c.homeAway === "away");
		const period = event.status?.period ?? 0;
		const homeScore = parseInt(home?.score ?? "0", 10);
		const awayScore = parseInt(away?.score ?? "0", 10);

		// Build quarters: for squares we need end-of-quarter scores (last digit).
		// ESPN gives current total; we use that as the latest quarter. If we had linescore we'd have each Q.
		const quarters: Quarter[] = [];
		const labels = ["Q1", "Q2", "Q3", "Q4"];
		for (let i = 0; i < Math.min(period || 1, 4); i++) {
			// Without per-quarter breakdown we use current total for the current period
			quarters.push({
				label: labels[i],
				rowTeamScore: i === (period || 1) - 1 ? homeScore : 0,
				colTeamScore: i === (period || 1) - 1 ? awayScore : 0,
			});
		}
		// If we have no period (scheduled), store empty or single zero quarter
		if (quarters.length === 0) {
			quarters.push({
				label: "Q1",
				rowTeamScore: homeScore,
				colTeamScore: awayScore,
			});
		}

		await ctx.runMutation(internal.games.setScoresFromScrape, {
			name: event.name ?? "NFL Game",
			externalId: event.id,
			quarters,
		});
		return { updated: true as const, quarters: quarters.length };
	},
});
