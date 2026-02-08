import { v } from "convex/values";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";

const quarterValidator = v.object({
	label: v.string(),
	rowTeamScore: v.number(),
	colTeamScore: v.number(),
	complete: v.optional(v.boolean()),
});

/**
 * Get the current global game (most recently updated).
 * Used by play and admin UIs to show scores and compute quarter winners.
 */
const possessionValidator = v.optional(
	v.union(v.literal("home"), v.literal("away"), v.literal("none")),
);

export const getCurrentGame = query({
	args: {},
	returns: v.union(
		v.object({
			found: v.literal(true),
			game: v.object({
				_id: v.id("games"),
				name: v.string(),
				externalId: v.optional(v.string()),
				quarters: v.array(quarterValidator),
				gameComplete: v.optional(v.boolean()),
				possession: possessionValidator,
				downDistance: v.optional(v.string()),
				isRedZone: v.optional(v.boolean()),
				updatedAt: v.number(),
				source: v.union(v.literal("manual"), v.literal("scrape")),
			}),
		}),
		v.object({ found: v.literal(false) }),
	),
	handler: async (ctx) => {
		const game = await ctx.db
			.query("games")
			.withIndex("by_updated")
			.order("desc")
			.first();
		if (!game) {
			return { found: false as const };
		}
		return {
			found: true as const,
			game: {
				_id: game._id,
				name: game.name,
				externalId: game.externalId,
				quarters: game.quarters,
				gameComplete: game.gameComplete,
				possession: game.possession,
				downDistance: game.downDistance,
				isRedZone: game.isRedZone,
				updatedAt: game.updatedAt,
				source: game.source,
			},
		};
	},
});

/**
 * Set quarter scores manually. Requires GLOBAL_ADMIN_SECRET to match.
 * Call from API route or dashboard that has the secret.
 */
export const setScoresManual = mutation({
	args: {
		adminSecret: v.string(),
		name: v.string(),
		quarters: v.array(quarterValidator),
		gameComplete: v.optional(v.boolean()),
	},
	returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) }),
	handler: async (ctx, args) => {
		const expected = process.env.GLOBAL_ADMIN_SECRET;
		if (!expected || args.adminSecret !== expected) {
			return { ok: false, error: "Unauthorized" };
		}
		// Validate score range: each score must be 0–99
		for (const q of args.quarters) {
			if (q.rowTeamScore < 0 || q.rowTeamScore > 99) {
				return {
					ok: false,
					error: `${q.label} row score must be 0–99 (got ${q.rowTeamScore}).`,
				};
			}
			if (q.colTeamScore < 0 || q.colTeamScore > 99) {
				return {
					ok: false,
					error: `${q.label} col score must be 0–99 (got ${q.colTeamScore}).`,
				};
			}
		}
		const now = Date.now();
		await ctx.db.insert("games", {
			name: args.name,
			quarters: args.quarters,
			gameComplete: args.gameComplete,
			updatedAt: now,
			source: "manual",
		});
		return { ok: true };
	},
});

/**
 * Internal query: get the latest game (most recently updated).
 * Used by the scraper action for dedup (skip insert if scores unchanged).
 */
export const getLatestGame = internalQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query("games")
			.withIndex("by_updated")
			.order("desc")
			.first();
	},
});

/**
 * Internal: set scores from scraper/action. Called by fetchNflScores action.
 */
export const setScoresFromScrape = internalMutation({
	args: {
		name: v.string(),
		externalId: v.optional(v.string()),
		quarters: v.array(quarterValidator),
		gameComplete: v.optional(v.boolean()),
		possession: possessionValidator,
		downDistance: v.optional(v.string()),
		isRedZone: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		await ctx.db.insert("games", {
			name: args.name,
			externalId: args.externalId,
			quarters: args.quarters,
			gameComplete: args.gameComplete,
			possession: args.possession,
			downDistance: args.downDistance,
			isRedZone: args.isRedZone,
			updatedAt: now,
			source: "scrape",
		});
	},
});
