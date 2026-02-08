import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Check if a sponsor payment has already been processed (idempotency).
 */
export const getPaymentByKey = internalQuery({
	args: { idempotencyKey: v.string() },
	returns: v.union(
		v.object({
			_id: v.id("sponsorPayments"),
			idempotencyKey: v.string(),
			amount: v.number(),
			createdAt: v.number(),
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		const doc = await ctx.db
			.query("sponsorPayments")
			.withIndex("by_idempotencyKey", (q) =>
				q.eq("idempotencyKey", args.idempotencyKey),
			)
			.first();
		if (!doc) return null;
		return {
			_id: doc._id,
			idempotencyKey: doc.idempotencyKey,
			amount: doc.amount,
			createdAt: doc.createdAt,
		};
	},
});

/**
 * Record a sponsor payment for idempotency.
 */
export const recordPayment = internalMutation({
	args: {
		idempotencyKey: v.string(),
		amount: v.number(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.insert("sponsorPayments", {
			idempotencyKey: args.idempotencyKey,
			amount: args.amount,
			createdAt: Date.now(),
		});
		return null;
	},
});

/**
 * Fulfil a sponsor payment: add bonus pool capacity.
 * Called from the Next.js Stripe webhook after signature verification.
 * Validates a shared secret and checks idempotency before adding capacity.
 */
export const fulfillSponsorship = action({
	args: {
		secret: v.string(),
		amount: v.number(),
		idempotencyKey: v.string(),
	},
	returns: v.object({ ok: v.boolean(), reason: v.optional(v.string()) }),
	handler: async (ctx, args) => {
		const expected = process.env.SPONSOR_WEBHOOK_SECRET;
		if (!expected || args.secret !== expected) {
			throw new ConvexError({
				code: "UNAUTHORIZED",
				message: "Invalid sponsor webhook secret",
			});
		}

		if (args.amount <= 0) {
			return { ok: false, reason: "Invalid amount" };
		}

		// Idempotency check
		const existing = await ctx.runQuery(
			internal.sponsor.getPaymentByKey,
			{ idempotencyKey: args.idempotencyKey },
		);
		if (existing) {
			return { ok: true, reason: "Already processed" };
		}

		// Record the payment, then add capacity
		await ctx.runMutation(internal.sponsor.recordPayment, {
			idempotencyKey: args.idempotencyKey,
			amount: args.amount,
		});

		await ctx.runMutation(internal.pools.addSponsorCapacity, {
			amount: args.amount,
		});

		return { ok: true };
	},
});
