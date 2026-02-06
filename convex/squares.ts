import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Claim one or more squares for a participant.
 * Validates pool is open, squares are unclaimed, and participant is under limit.
 */
export const claimSquares = mutation({
	args: {
		poolId: v.id("pools"),
		participantId: v.id("participants"),
		squareIndexes: v.array(v.number()),
	},
	returns: v.object({
		claimed: v.array(v.number()),
	}),
	handler: async (ctx, args) => {
		const pool = await ctx.db.get(args.poolId);
		if (!pool) {
			throw new ConvexError({ code: "NOT_FOUND", message: "Pool not found" });
		}

		if (pool.status !== "open") {
			throw new ConvexError({
				code: "POOL_LOCKED",
				message: "Pool is locked, cannot claim squares",
			});
		}

		const participant = await ctx.db.get(args.participantId);
		if (!participant || participant.poolId !== args.poolId) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "Participant not found in this pool",
			});
		}

		// Get all squares for this pool
		const allSquares = await ctx.db
			.query("squares")
			.withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
			.collect();

		// Count how many squares this participant already has
		const currentCount = allSquares.filter(
			(s) => s.participantId === args.participantId,
		).length;

		const maxAllowed = pool.maxSquaresPerPerson;
		const canClaim = maxAllowed - currentCount;

		if (canClaim <= 0) {
			throw new ConvexError({
				code: "LIMIT_REACHED",
				message: `You've already claimed ${maxAllowed} squares`,
			});
		}

		const claimed: number[] = [];

		for (const idx of args.squareIndexes) {
			if (claimed.length >= canClaim) break;

			const square = allSquares.find((s) => s.index === idx);
			if (!square) continue;
			if (square.participantId) continue; // Already claimed

			await ctx.db.patch(square._id, { participantId: args.participantId });
			claimed.push(idx);
		}

		return { claimed };
	},
});

/**
 * Distribute remaining unclaimed squares randomly among existing participants.
 * Each participant gets an equal share (remainder distributed one-by-one).
 */
export const distributeSquares = mutation({
	args: {
		poolId: v.id("pools"),
	},
	returns: v.object({
		ok: v.boolean(),
		distributed: v.number(),
		error: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		const pool = await ctx.db.get(args.poolId);
		if (!pool) {
			return { ok: false as const, distributed: 0, error: "Pool not found" };
		}

		const participants = await ctx.db
			.query("participants")
			.withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
			.collect();

		if (participants.length === 0) {
			return { ok: false as const, distributed: 0, error: "No players have joined yet" };
		}

		const allSquares = await ctx.db
			.query("squares")
			.withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
			.collect();

		const unclaimed = allSquares.filter((s) => !s.participantId);
		if (unclaimed.length === 0) {
			return { ok: false as const, distributed: 0, error: "All squares are already claimed" };
		}

		// Shuffle unclaimed squares
		const shuffled = [...unclaimed];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}

		// Distribute round-robin among participants
		let distributed = 0;
		for (let i = 0; i < shuffled.length; i++) {
			const participant = participants[i % participants.length];
			await ctx.db.patch(shuffled[i]._id, { participantId: participant._id });
			distributed++;
		}

		return { ok: true as const, distributed };
	},
});

/**
 * Release squares (optional, for admin or participant).
 */
export const releaseSquares = mutation({
	args: {
		poolId: v.id("pools"),
		squareIndexes: v.array(v.number()),
	},
	returns: v.object({
		released: v.array(v.number()),
	}),
	handler: async (ctx, args) => {
		const pool = await ctx.db.get(args.poolId);
		if (!pool) {
			throw new ConvexError({ code: "NOT_FOUND", message: "Pool not found" });
		}

		const released: number[] = [];

		for (const idx of args.squareIndexes) {
			const square = await ctx.db
				.query("squares")
				.withIndex("by_pool_index", (q) =>
					q.eq("poolId", args.poolId).eq("index", idx),
				)
				.first();

			if (square?.participantId) {
				await ctx.db.patch(square._id, { participantId: undefined });
				released.push(idx);
			}
		}

		return { released };
	},
});
