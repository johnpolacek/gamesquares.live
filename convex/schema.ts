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
		graphic: v.optional(v.string()),
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

	sponsorPayments: defineTable({
		idempotencyKey: v.string(),
		amount: v.number(),
		createdAt: v.number(),
	}).index("by_idempotencyKey", ["idempotencyKey"]),

	// One global game: quarter scores for Super Bowl squares (row/col = last digit per quarter)
	games: defineTable({
		name: v.string(),
		externalId: v.optional(v.string()),
		quarters: v.array(
			v.object({
				label: v.string(),
				rowTeamScore: v.number(),
				colTeamScore: v.number(),
				complete: v.optional(v.boolean()),
			}),
		),
		gameComplete: v.optional(v.boolean()),
		// Ball possession: "home" (row team), "away" (col team), or "none" (halftime/dead ball)
		possession: v.optional(
			v.union(v.literal("home"), v.literal("away"), v.literal("none")),
		),
		downDistance: v.optional(v.string()), // e.g. "SEA 3rd & 7 at NE 42"
		isRedZone: v.optional(v.boolean()),
		updatedAt: v.number(),
		source: v.union(v.literal("manual"), v.literal("scrape")),
	}).index("by_updated", ["updatedAt"]),
});
