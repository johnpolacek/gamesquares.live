import { v } from "convex/values";
import { mutation } from "./_generated/server";

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const createAdminLoginToken = mutation({
	args: {
		poolId: v.id("pools"),
		tokenHash: v.string(),
	},
	returns: v.object({
		expiresAt: v.number(),
	}),
	handler: async (ctx, args) => {
		const expiresAt = Date.now() + TTL_MS;
		await ctx.db.insert("adminLoginTokens", {
			poolId: args.poolId,
			tokenHash: args.tokenHash,
			expiresAt,
		});
		return { expiresAt };
	},
});

/**
 * Validate an admin login token (reusable within TTL).
 * Returns the pool slug for redirect if valid.
 */
export const validateToken = mutation({
	args: {
		tokenHash: v.string(),
	},
	returns: v.union(
		v.object({ success: v.literal(true), slug: v.string(), title: v.string(), poolId: v.id("pools") }),
		v.object({ success: v.literal(false), error: v.string() }),
	),
	handler: async (ctx, args) => {
		const token = await ctx.db
			.query("adminLoginTokens")
			.withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
			.first();

		if (!token) {
			return { success: false as const, error: "Invalid or expired link" };
		}

		if (Date.now() > token.expiresAt) {
			return { success: false as const, error: "This link has expired" };
		}

		// Get pool for redirect
		const pool = await ctx.db.get(token.poolId);
		if (!pool) {
			return { success: false as const, error: "Pool not found" };
		}

		return { success: true as const, slug: pool.slug, title: pool.title, poolId: pool._id };
	},
});
