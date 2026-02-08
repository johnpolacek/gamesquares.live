import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";

const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_LENGTH = 8;
const BASE_CAP = 100;

function generateSlug(): string {
	let result = "";
	for (let i = 0; i < SLUG_LENGTH; i++) {
		result += SLUG_CHARS[Math.floor(Math.random() * SLUG_CHARS.length)];
	}
	return result;
}

export const createPool = mutation({
	args: {
		title: v.string(),
		adminEmail: v.string(),
		maxSquaresPerPerson: v.number(),
	},
	returns: v.object({
		slug: v.string(),
		poolId: v.id("pools"),
	}),
	handler: async (ctx, args) => {
		const now = Date.now();
		const adminEmailLower = args.adminEmail.trim().toLowerCase();
		if (!adminEmailLower) {
			throw new ConvexError({
				code: "INVALID_INPUT",
				message: "Admin email is required",
			});
		}

		let limits = await ctx.db.query("globalLimits").first();
		if (!limits) {
			await ctx.db.insert("globalLimits", {
				windowStart: now,
				createdCount: 0,
				bonusCapacity: 0,
				bonusExpiresAt: 0,
			});
			limits = await ctx.db.query("globalLimits").first();
			if (!limits) {
				throw new ConvexError({
					code: "INTERNAL_ERROR",
					message: "Failed to init global limits",
				});
			}
		}

		const cap = BASE_CAP + limits.bonusCapacity;
		if (limits.createdCount >= cap) {
			throw new ConvexError({
				code: "RATE_LIMIT",
				message: "Pool creation limit reached. Try again later.",
			});
		}

		let slug: string;
		let existing: Doc<"pools"> | null;
		do {
			slug = generateSlug();
			existing = await ctx.db
				.query("pools")
				.withIndex("by_slug", (q) => q.eq("slug", slug))
				.first();
		} while (existing);

		const poolId = await ctx.db.insert("pools", {
			slug,
			title: args.title.trim(),
			adminEmail: adminEmailLower,
			status: "open",
			maxSquaresPerPerson: args.maxSquaresPerPerson,
			createdAt: now,
		});

		for (let i = 0; i < 100; i++) {
			await ctx.db.insert("squares", {
				poolId,
				index: i,
			});
		}

		await ctx.db.patch(limits._id, {
			createdCount: limits.createdCount + 1,
		});

		return { slug, poolId };
	},
});

/**
 * Get the total number of pools created.
 * Used on the homepage for a real-time counter.
 */
export const getPoolCount = query({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const pools = await ctx.db.query("pools").collect();
		return pools.length;
	},
});

/** Pool summary for admin list */
const poolSummaryValidator = v.object({
	_id: v.id("pools"),
	title: v.string(),
	slug: v.string(),
	status: v.union(v.literal("open"), v.literal("locked")),
	createdAt: v.number(),
	participantCount: v.number(),
	claimedCount: v.number(),
});

/**
 * List pools for admin dashboard (most recent first).
 */
export const listPools = query({
	args: {},
	returns: v.array(poolSummaryValidator),
	handler: async (ctx) => {
		const pools = await ctx.db.query("pools").collect();
		const sorted = pools.sort((a, b) => b.createdAt - a.createdAt);
		const limited = sorted.slice(0, 100);

		const result = await Promise.all(
			limited.map(async (pool) => {
				const participants = await ctx.db
					.query("participants")
					.withIndex("by_pool", (q) => q.eq("poolId", pool._id))
					.collect();
				const squares = await ctx.db
					.query("squares")
					.withIndex("by_pool", (q) => q.eq("poolId", pool._id))
					.collect();
				const claimedCount = squares.filter((s) => s.participantId).length;
				return {
					_id: pool._id,
					title: pool.title,
					slug: pool.slug,
					status: pool.status,
					createdAt: pool.createdAt,
					participantCount: participants.length,
					claimedCount,
				};
			}),
		);
		return result;
	},
});

/**
 * Get a pool by slug with all squares and participants.
 * Used for both admin and player views.
 */
export const getPoolBySlug = query({
	args: { slug: v.string() },
	returns: v.union(
		v.object({
			found: v.literal(true),
			pool: v.object({
				_id: v.id("pools"),
				slug: v.string(),
				title: v.string(),
				adminEmail: v.string(),
				status: v.union(v.literal("open"), v.literal("locked")),
				maxSquaresPerPerson: v.number(),
				createdAt: v.number(),
				rowNumbers: v.optional(v.array(v.number())),
				colNumbers: v.optional(v.array(v.number())),
			}),
			squares: v.array(
				v.object({
					_id: v.id("squares"),
					poolId: v.id("pools"),
					index: v.number(),
					participantId: v.optional(v.id("participants")),
				}),
			),
			participants: v.array(
				v.object({
					_id: v.id("participants"),
					poolId: v.id("pools"),
					displayName: v.string(),
					graphic: v.optional(v.string()),
					createdAt: v.number(),
				}),
			),
		}),
		v.object({ found: v.literal(false) }),
	),
	handler: async (ctx, args) => {
		const poolDoc = await ctx.db
			.query("pools")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.first();

		if (!poolDoc) {
			return { found: false as const };
		}

		const squaresRaw = await ctx.db
			.query("squares")
			.withIndex("by_pool", (q) => q.eq("poolId", poolDoc._id))
			.collect();

		const participantsRaw = await ctx.db
			.query("participants")
			.withIndex("by_pool", (q) => q.eq("poolId", poolDoc._id))
			.collect();

		// Extract only the fields we want to return (exclude _creationTime)
		const pool = {
			_id: poolDoc._id,
			slug: poolDoc.slug,
			title: poolDoc.title,
			adminEmail: poolDoc.adminEmail,
			status: poolDoc.status,
			maxSquaresPerPerson: poolDoc.maxSquaresPerPerson,
			createdAt: poolDoc.createdAt,
			rowNumbers: poolDoc.rowNumbers,
			colNumbers: poolDoc.colNumbers,
		};

		const squares = squaresRaw.map((s) => ({
			_id: s._id,
			poolId: s.poolId,
			index: s.index,
			participantId: s.participantId,
		}));

		const participants = participantsRaw.map((p) => ({
			_id: p._id,
			poolId: p.poolId,
			displayName: p.displayName,
			graphic: p.graphic,
			createdAt: p.createdAt,
		}));

		return { found: true as const, pool, squares, participants };
	},
});

/**
 * Update the max squares per person for a pool.
 * Can increase freely. Can only decrease if no participant already has more
 * than the new limit.
 */
export const updateMaxSquares = mutation({
	args: {
		poolId: v.id("pools"),
		maxSquaresPerPerson: v.number(),
	},
	returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) }),
	handler: async (ctx, args) => {
		const pool = await ctx.db.get(args.poolId);
		if (!pool) {
			return { ok: false as const, error: "Pool not found" };
		}

		const newMax = Math.max(1, Math.min(100, Math.round(args.maxSquaresPerPerson)));

		if (newMax < pool.maxSquaresPerPerson) {
			// Decreasing — check if any player already has more than newMax
			const allSquares = await ctx.db
				.query("squares")
				.withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
				.collect();

			const countByParticipant = new Map<string, number>();
			for (const sq of allSquares) {
				if (sq.participantId) {
					countByParticipant.set(
						sq.participantId,
						(countByParticipant.get(sq.participantId) ?? 0) + 1,
					);
				}
			}

			for (const [, count] of countByParticipant) {
				if (count > newMax) {
					return {
						ok: false as const,
						error: `A player already has ${count} squares. They must release some first.`,
					};
				}
			}
		}

		await ctx.db.patch(args.poolId, { maxSquaresPerPerson: newMax });
		return { ok: true as const };
	},
});

/**
 * Randomly assign row and column numbers (0–9 shuffled) to the pool.
 * This can be called at any time by the admin — it shuffles new numbers
 * each time it's called until the admin is happy.
 */
export const assignNumbers = mutation({
	args: {
		poolId: v.id("pools"),
	},
	returns: v.object({
		ok: v.boolean(),
		rowNumbers: v.optional(v.array(v.number())),
		colNumbers: v.optional(v.array(v.number())),
		error: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		const pool = await ctx.db.get(args.poolId);
		if (!pool) {
			return { ok: false as const, error: "Pool not found" };
		}

		// Fisher-Yates shuffle
		function shuffle(arr: number[]): number[] {
			const a = [...arr];
			for (let i = a.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[a[i], a[j]] = [a[j], a[i]];
			}
			return a;
		}

		const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
		const rowNumbers = shuffle(digits);
		const colNumbers = shuffle(digits);

		await ctx.db.patch(args.poolId, { rowNumbers, colNumbers });

		return { ok: true as const, rowNumbers, colNumbers };
	},
});

/**
 * Add sponsored capacity to the global pool limit.
 * Internal-only — called by the sponsor fulfillment action after a successful Stripe payment.
 */
export const addSponsorCapacity = internalMutation({
	args: { amount: v.number() },
	returns: v.null(),
	handler: async (ctx, args) => {
		if (args.amount <= 0) return null;
		let limits = await ctx.db.query("globalLimits").first();
		if (!limits) {
			const now = Date.now();
			await ctx.db.insert("globalLimits", {
				windowStart: now,
				createdCount: 0,
				bonusCapacity: 0,
				bonusExpiresAt: 0,
			});
			limits = await ctx.db.query("globalLimits").first();
			if (!limits) return null;
		}
		await ctx.db.patch(limits._id, {
			bonusCapacity: limits.bonusCapacity + args.amount,
		});
		return null;
	},
});

/**
 * Reset global rate-limit counter. Internal-only (not callable from clients).
 * Useful for testing or manual maintenance.
 */
export const resetGlobalLimits = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const limits = await ctx.db.query("globalLimits").first();
		if (limits) {
			await ctx.db.patch(limits._id, {
				createdCount: 0,
				windowStart: Date.now(),
			});
		}
	},
});
