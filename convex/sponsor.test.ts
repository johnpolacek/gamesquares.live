import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "../convex-test-setup";

describe("addSponsorCapacity", () => {
	it("increases bonusCapacity from zero", async () => {
		const t = convexTest(schema, modules);
		// Seed globalLimits
		await t.run(async (ctx) => {
			await ctx.db.insert("globalLimits", {
				windowStart: Date.now(),
				createdCount: 50,
				bonusCapacity: 0,
				bonusExpiresAt: 0,
			});
		});
		await t.mutation(internal.pools.addSponsorCapacity, { amount: 10 });
		const limits = await t.run(async (ctx) => {
			return ctx.db.query("globalLimits").first();
		});
		expect(limits).not.toBeNull();
		expect(limits!.bonusCapacity).toBe(10);
	});

	it("accumulates bonusCapacity across multiple calls", async () => {
		const t = convexTest(schema, modules);
		await t.run(async (ctx) => {
			await ctx.db.insert("globalLimits", {
				windowStart: Date.now(),
				createdCount: 50,
				bonusCapacity: 5,
				bonusExpiresAt: 0,
			});
		});
		await t.mutation(internal.pools.addSponsorCapacity, { amount: 10 });
		await t.mutation(internal.pools.addSponsorCapacity, { amount: 3 });
		const limits = await t.run(async (ctx) => {
			return ctx.db.query("globalLimits").first();
		});
		expect(limits!.bonusCapacity).toBe(18);
	});

	it("does nothing for amount <= 0", async () => {
		const t = convexTest(schema, modules);
		await t.run(async (ctx) => {
			await ctx.db.insert("globalLimits", {
				windowStart: Date.now(),
				createdCount: 0,
				bonusCapacity: 5,
				bonusExpiresAt: 0,
			});
		});
		await t.mutation(internal.pools.addSponsorCapacity, { amount: 0 });
		const limits = await t.run(async (ctx) => {
			return ctx.db.query("globalLimits").first();
		});
		expect(limits!.bonusCapacity).toBe(5);
	});

	it("initialises globalLimits if missing", async () => {
		const t = convexTest(schema, modules);
		await t.mutation(internal.pools.addSponsorCapacity, { amount: 7 });
		const limits = await t.run(async (ctx) => {
			return ctx.db.query("globalLimits").first();
		});
		expect(limits).not.toBeNull();
		expect(limits!.bonusCapacity).toBe(7);
		expect(limits!.createdCount).toBe(0);
	});
});

describe("sponsor idempotency", () => {
	it("recordPayment + getPaymentByKey round-trips", async () => {
		const t = convexTest(schema, modules);
		// Initially not found
		const before = await t.query(internal.sponsor.getPaymentByKey, {
			idempotencyKey: "pi_test_123",
		});
		expect(before).toBeNull();

		await t.mutation(internal.sponsor.recordPayment, {
			idempotencyKey: "pi_test_123",
			amount: 10,
		});

		const after = await t.query(internal.sponsor.getPaymentByKey, {
			idempotencyKey: "pi_test_123",
		});
		expect(after).not.toBeNull();
		expect(after!.amount).toBe(10);
		expect(after!.idempotencyKey).toBe("pi_test_123");
	});
});

describe("createPool with bonusCapacity", () => {
	it("allows pool creation when bonusCapacity raises the cap", async () => {
		const t = convexTest(schema, modules);
		// Seed at base cap (100), but with bonus 5
		await t.run(async (ctx) => {
			await ctx.db.insert("globalLimits", {
				windowStart: Date.now(),
				createdCount: 100,
				bonusCapacity: 5,
				bonusExpiresAt: 0,
			});
		});
		// Should succeed because cap = 100 + 5 = 105 > 100 (createdCount)
		const result = await t.mutation(api.pools.createPool, {
			title: "Sponsored Pool",
			adminEmail: "sponsor@test.com",
			maxSquaresPerPerson: 5,
		});
		expect(result.slug).toBeDefined();
	});

	it("still rejects when bonusCapacity is exhausted", async () => {
		const t = convexTest(schema, modules);
		await t.run(async (ctx) => {
			await ctx.db.insert("globalLimits", {
				windowStart: Date.now(),
				createdCount: 105,
				bonusCapacity: 5,
				bonusExpiresAt: 0,
			});
		});
		// cap = 100 + 5 = 105 = createdCount → should reject
		await expect(
			t.mutation(api.pools.createPool, {
				title: "Over cap",
				adminEmail: "a@b.com",
				maxSquaresPerPerson: 5,
			}),
		).rejects.toThrow();
	});
});
