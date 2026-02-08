"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const ESPN_SCOREBOARD_URL =
	"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

type Quarter = {
	label: string;
	rowTeamScore: number;
	colTeamScore: number;
	complete?: boolean;
};

// ── ESPN response types (only the fields we care about) ─────────────────
type EspnLinescore = { value: number };

type EspnCompetitor = {
	id?: string;
	homeAway: string;
	score: string;
	team?: { id?: string; abbreviation: string; displayName: string };
	linescores?: EspnLinescore[];
};

type EspnNote = { headline?: string };

type EspnStatusType = {
	state: "pre" | "in" | "post";
	completed: boolean;
};

type EspnStatus = {
	period?: number;
	type?: EspnStatusType;
};

type EspnSituation = {
	possession?: string; // team ID of team with ball
	downDistanceText?: string; // e.g. "3rd & 7"
	possessionText?: string; // e.g. "SEA 3rd & 7 at NE 42"
	isRedZone?: boolean;
};

type EspnEvent = {
	id: string;
	name: string;
	season?: { type: number };
	week?: { number: number };
	competitions?: Array<{
		competitors?: EspnCompetitor[];
		notes?: EspnNote[];
		situation?: EspnSituation;
	}>;
	status?: EspnStatus;
};

type EspnScoreboard = {
	events?: EspnEvent[];
};

/**
 * Find the Super Bowl event from the ESPN scoreboard response.
 * Strategy (in order):
 *  1. Postseason (season.type === 3) week 5 — always the Super Bowl.
 *  2. Notes headline containing "Super Bowl".
 *  3. Fallback to the first event.
 */
function findSuperBowl(events: EspnEvent[]): EspnEvent | undefined {
	// 1. Postseason week 5
	const byWeek = events.find(
		(e) => e.season?.type === 3 && e.week?.number === 5,
	);
	if (byWeek) return byWeek;

	// 2. Notes headline
	const byNotes = events.find((e) =>
		e.competitions?.some((c) =>
			c.notes?.some((n) =>
				n.headline?.toLowerCase().includes("super bowl"),
			),
		),
	);
	if (byNotes) return byNotes;

	// 3. Name fallback (broad)
	const byName = events.find(
		(e) =>
			e.name?.toLowerCase().includes("super bowl") ||
			e.name?.toLowerCase().includes("seahawks") ||
			e.name?.toLowerCase().includes("patriots"),
	);
	if (byName) return byName;

	// 4. First event
	return events[0];
}

/**
 * Build cumulative quarter scores from ESPN linescores.
 *
 * ESPN linescores give points scored IN each quarter (not cumulative).
 * For squares we need the cumulative total at the end of each quarter,
 * because the last digit of the cumulative score determines the winning square.
 *
 * For the in-progress quarter (where no linescore entry exists yet),
 * we use the current total score (which ESPN gives as `competitor.score`).
 */
function buildQuarters(
	home: EspnCompetitor,
	away: EspnCompetitor,
	period: number,
	gameState: "pre" | "in" | "post",
	gameCompleted: boolean,
): { quarters: Quarter[]; gameComplete: boolean } {
	const homeLinescores = home.linescores ?? [];
	const awayLinescores = away.linescores ?? [];
	const homeTotalScore = parseInt(home.score ?? "0", 10);
	const awayTotalScore = parseInt(away.score ?? "0", 10);

	const labels = ["Q1", "Q2", "Q3", "Q4"];
	const quarters: Quarter[] = [];

	// Number of quarters to emit: up to 4 (we don't model OT as a separate quarter for squares)
	const numQuarters = Math.min(Math.max(period, 1), 4);

	let homeCum = 0;
	let awayCum = 0;

	for (let i = 0; i < numQuarters; i++) {
		const hasHomeLinescore = i < homeLinescores.length;
		const hasAwayLinescore = i < awayLinescores.length;

		if (hasHomeLinescore && hasAwayLinescore) {
			// Completed quarter — add period points to cumulative total
			homeCum += homeLinescores[i].value;
			awayCum += awayLinescores[i].value;
		} else {
			// Current or future quarter — use total game score
			homeCum = homeTotalScore;
			awayCum = awayTotalScore;
		}

		// A quarter is complete when the current period has moved past it,
		// OR the game itself is complete.
		const isComplete =
			gameCompleted || (gameState === "post") || (period > i + 1);

		quarters.push({
			label: labels[i],
			rowTeamScore: homeCum, // home = row
			colTeamScore: awayCum, // away = col
			complete: isComplete || undefined,
		});
	}

	const gameComplete = gameCompleted || gameState === "post";

	return { quarters, gameComplete };
}

/**
 * Check if two quarter arrays are identical (for dedup).
 */
function quartersEqual(
	a: Quarter[],
	b: { label: string; rowTeamScore: number; colTeamScore: number; complete?: boolean }[],
): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (
			a[i].label !== b[i].label ||
			a[i].rowTeamScore !== b[i].rowTeamScore ||
			a[i].colTeamScore !== b[i].colTeamScore ||
			(a[i].complete ?? false) !== (b[i].complete ?? false)
		) {
			return false;
		}
	}
	return true;
}

/**
 * Read-only diagnostic: fetch ESPN scoreboard and return all parsed data
 * WITHOUT writing anything to the database. Used by the admin status page
 * to verify the feed is working before game day.
 */
export const diagnoseEspnFeed = action({
	args: {},
	handler: async (ctx) => {
		// 1. Fetch ESPN
		let espnStatus: number;
		let data: EspnScoreboard;
		try {
			const res = await fetch(ESPN_SCOREBOARD_URL);
			espnStatus = res.status;
			if (!res.ok) {
				return {
					ok: false as const,
					error: `ESPN returned HTTP ${res.status}`,
					espnStatus,
				};
			}
			data = (await res.json()) as EspnScoreboard;
		} catch (err) {
			return {
				ok: false as const,
				error: `ESPN fetch failed: ${err instanceof Error ? err.message : String(err)}`,
				espnStatus: 0,
			};
		}

		const events = data.events ?? [];
		const event = findSuperBowl(events);

		if (!event?.competitions?.[0]?.competitors?.length) {
			return {
				ok: true as const,
				espnStatus,
				totalEvents: events.length,
				superBowlFound: false,
				eventName: null,
				eventId: null,
				gameState: null,
				period: null,
				gameCompleted: false,
				homeTeam: null,
				awayTeam: null,
				quarters: [] as Quarter[],
				gameComplete: false,
				possession: "none" as const,
				downDistance: null as string | null,
				isRedZone: false,
				currentDbGame: null as null,
				wouldUpdate: false,
				wouldUpdateReason: "no game found on ESPN",
			};
		}

		const comp = event.competitions[0];
		const competitors = comp.competitors ?? [];
		const home = competitors.find((c) => c.homeAway === "home");
		const away = competitors.find((c) => c.homeAway === "away");

		const gameState = event.status?.type?.state ?? "pre";
		const gameCompleted = event.status?.type?.completed ?? false;
		const period = event.status?.period ?? 0;

		const homeTeam = home
			? {
					name: home.team?.displayName ?? "Unknown",
					abbreviation: home.team?.abbreviation ?? "???",
					score: home.score ?? "0",
					id: home.id ?? home.team?.id ?? null,
				}
			: null;
		const awayTeam = away
			? {
					name: away.team?.displayName ?? "Unknown",
					abbreviation: away.team?.abbreviation ?? "???",
					score: away.score ?? "0",
					id: away.id ?? away.team?.id ?? null,
				}
			: null;

		// Build quarters (even for pre-game, for display purposes)
		let quarters: Quarter[] = [];
		let gameComplete = false;
		if (home && away && gameState !== "pre") {
			const result = buildQuarters(home, away, period, gameState, gameCompleted);
			quarters = result.quarters;
			gameComplete = result.gameComplete;
		}

		// Extract possession
		const situation = comp.situation;
		let possession: "home" | "away" | "none" = "none";
		if (situation?.possession && home && away) {
			const homeTeamId = home.id ?? home.team?.id;
			const awayTeamId = away.id ?? away.team?.id;
			if (situation.possession === homeTeamId) {
				possession = "home";
			} else if (situation.possession === awayTeamId) {
				possession = "away";
			}
		}
		const downDistance =
			situation?.possessionText ?? situation?.downDistanceText ?? null;
		const isRedZone = situation?.isRedZone ?? false;

		// Compare with current DB state
		const latestGame = await ctx.runQuery(internal.games.getLatestGame, {});
		const currentDbGame = latestGame
			? {
					name: latestGame.name,
					updatedAt: latestGame.updatedAt,
					quartersCount: latestGame.quarters.length,
					gameComplete: latestGame.gameComplete ?? false,
					possession: latestGame.possession ?? "none",
					downDistance: latestGame.downDistance ?? null,
				}
			: null;

		// Determine if fetchAndUpdateScores would write
		let wouldUpdate = false;
		let wouldUpdateReason = "";
		if (gameState === "pre") {
			wouldUpdateReason = "game not started yet (pre)";
		} else if (!home || !away) {
			wouldUpdateReason = "missing home/away teams";
		} else if (!latestGame) {
			wouldUpdate = true;
			wouldUpdateReason = "no existing game in DB — would insert first row";
		} else {
			const sameScores = quartersEqual(quarters, latestGame.quarters);
			const sameComplete =
				(gameComplete || false) === (latestGame.gameComplete || false);
			const samePossession =
				(possession || "none") === (latestGame.possession || "none");
			const sameDownDistance =
				(downDistance || "") === (latestGame.downDistance || "");
			if (sameScores && sameComplete && samePossession && sameDownDistance) {
				wouldUpdateReason = "all data unchanged — dedup would skip";
			} else {
				wouldUpdate = true;
				const changes: string[] = [];
				if (!sameScores) changes.push("scores changed");
				if (!sameComplete) changes.push("gameComplete changed");
				if (!samePossession) changes.push("possession changed");
				if (!sameDownDistance) changes.push("downDistance changed");
				wouldUpdateReason = `would update: ${changes.join(", ")}`;
			}
		}

		return {
			ok: true as const,
			espnStatus,
			totalEvents: events.length,
			superBowlFound: true,
			eventName: event.name ?? null,
			eventId: event.id ?? null,
			gameState,
			period,
			gameCompleted,
			homeTeam,
			awayTeam,
			quarters,
			gameComplete,
			possession,
			downDistance,
			isRedZone,
			currentDbGame,
			wouldUpdate,
			wouldUpdateReason,
		};
	},
});

/**
 * Fetch NFL scoreboard from ESPN, find the Super Bowl,
 * and update the global game with current quarter scores.
 *
 * Uses per-quarter linescores for accurate cumulative totals.
 * Skips insert when game hasn't started or when scores are unchanged (dedup).
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
		const data = (await res.json()) as EspnScoreboard;

		const events = data.events ?? [];
		const event = findSuperBowl(events);

		if (!event?.competitions?.[0]?.competitors?.length) {
			return { updated: false as const, reason: "no game found" };
		}

		const comp = event.competitions[0];
		const competitors = comp.competitors ?? [];
		const home = competitors.find((c) => c.homeAway === "home");
		const away = competitors.find((c) => c.homeAway === "away");

		if (!home || !away) {
			return { updated: false as const, reason: "missing home/away teams" };
		}

		const gameState = event.status?.type?.state ?? "pre";
		const gameCompleted = event.status?.type?.completed ?? false;
		const period = event.status?.period ?? 0;

		// Skip pre-game: no scores to report
		if (gameState === "pre") {
			return { updated: false as const, reason: "game not started" };
		}

		const { quarters, gameComplete } = buildQuarters(
			home,
			away,
			period,
			gameState,
			gameCompleted,
		);

		// Extract possession info from situation
		const situation = comp.situation;
		let possession: "home" | "away" | "none" = "none";
		if (situation?.possession) {
			const homeTeamId = home.id ?? home.team?.id;
			const awayTeamId = away.id ?? away.team?.id;
			if (situation.possession === homeTeamId) {
				possession = "home";
			} else if (situation.possession === awayTeamId) {
				possession = "away";
			}
		}
		const downDistance = situation?.possessionText ?? situation?.downDistanceText ?? undefined;
		const isRedZone = situation?.isRedZone ?? undefined;

		// Dedup: check if the latest game row already has identical data
		const latestGame = await ctx.runQuery(internal.games.getLatestGame, {});
		if (latestGame) {
			const sameScores = quartersEqual(quarters, latestGame.quarters);
			const sameComplete =
				(gameComplete || false) === (latestGame.gameComplete || false);
			const samePossession =
				(possession || "none") === (latestGame.possession || "none");
			const sameDownDistance =
				(downDistance || "") === (latestGame.downDistance || "");
			if (sameScores && sameComplete && samePossession && sameDownDistance) {
				return { updated: false as const, reason: "scores unchanged" };
			}
		}

		const gameName =
			event.name?.replace(/ at /i, " vs ") ?? "NFL Game";

		await ctx.runMutation(internal.games.setScoresFromScrape, {
			name: gameName,
			externalId: event.id,
			quarters,
			gameComplete: gameComplete || undefined,
			possession,
			downDistance,
			isRedZone,
		});

		return { updated: true as const, quarters: quarters.length };
	},
});
