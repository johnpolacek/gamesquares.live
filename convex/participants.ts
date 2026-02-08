import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Join a pool as a participant with a display name.
 * Returns existing participant if displayName already exists in pool.
 */
export const joinPool = mutation({
	args: {
		poolId: v.id("pools"),
		displayName: v.string(),
		graphic: v.optional(v.string()),
	},
	returns: v.object({
		participantId: v.id("participants"),
		displayName: v.string(),
	}),
	handler: async (ctx, args) => {
		const pool = await ctx.db.get(args.poolId);
		if (!pool) {
			throw new ConvexError({ code: "NOT_FOUND", message: "Pool not found" });
		}

		const trimmedName = args.displayName.trim();
		if (!trimmedName) {
			throw new ConvexError({
				code: "INVALID_INPUT",
				message: "Display name is required",
			});
		}

		// Check if participant already exists with this name in this pool
		const existing = await ctx.db
			.query("participants")
			.withIndex("by_pool", (q) => q.eq("poolId", args.poolId))
			.filter((q) => q.eq(q.field("displayName"), trimmedName))
			.first();

		if (existing) {
			// Backfill graphic if provided and missing or different
			if (args.graphic && existing.graphic !== args.graphic) {
				await ctx.db.patch(existing._id, { graphic: args.graphic });
			}
			return { participantId: existing._id, displayName: existing.displayName };
		}

		// Create new participant
		const participantId = await ctx.db.insert("participants", {
			poolId: args.poolId,
			displayName: trimmedName,
			graphic: args.graphic,
			createdAt: Date.now(),
		});

		return { participantId, displayName: trimmedName };
	},
});

/**
 * Update a participant's graphic/icon.
 */
export const updateGraphic = mutation({
	args: {
		participantId: v.id("participants"),
		graphic: v.string(),
	},
	returns: v.object({ ok: v.boolean() }),
	handler: async (ctx, args) => {
		const participant = await ctx.db.get(args.participantId);
		if (!participant) {
			throw new ConvexError({
				code: "NOT_FOUND",
				message: "Participant not found",
			});
		}
		await ctx.db.patch(args.participantId, { graphic: args.graphic });
		return { ok: true };
	},
});
