// Stage 1: Core data model.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	pools: defineTable({
		slug: v.string(),
		title: v.string(),
		adminEmail: v.string(),
		status: v.union(v.literal("open"), v.literal("locked")),
		maxSquaresPerPerson: v.number(),
		createdAt: v.number(),
		rowNumbers: v.optional(v.array(v.number())),
		colNumbers: v.optional(v.array(v.number())),
	}).index("by_slug", ["slug"]),

	squares: defineTable({
		poolId: v.id("pools"),
		index: v.number(), // 0–99
		participantId: v.optional(v.id("participants")),
	})
		.index("by_pool", ["poolId"])
		.index("by_pool_index", ["poolId", "index"]),

	participants: defineTable({
		poolId: v.id("pools"),
		displayName: v.string(),
		createdAt: v.number(),
	}).index("by_pool", ["poolId"]),

	adminLoginTokens: defineTable({
		poolId: v.id("pools"),
		tokenHash: v.string(),
		expiresAt: v.number(),
		usedAt: v.optional(v.number()),
	})
		.index("by_tokenHash", ["tokenHash"])
		.index("by_pool", ["poolId"]),

	globalLimits: defineTable({
		windowStart: v.number(),
		createdCount: v.number(),
		bonusCapacity: v.number(),
		bonusExpiresAt: v.number(),
	}),
});
