import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "../convex-test-setup";

describe("adminLoginTokens", () => {
	it("createAdminLoginToken returns expiresAt", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		const result = await t.mutation(api.adminLoginTokens.createAdminLoginToken, {
			poolId,
			tokenHash: "abc123",
		});
		expect(result.expiresAt).toBeGreaterThan(Date.now());
	});

	it("validateToken succeeds and returns slug and poolId", async () => {
		const t = convexTest(schema, modules);
		const { poolId, slug } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		await t.mutation(api.adminLoginTokens.createAdminLoginToken, {
			poolId,
			tokenHash: "valid-token",
		});
		const result = await t.mutation(
			api.adminLoginTokens.validateToken,
			{ tokenHash: "valid-token" },
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.slug).toBe(slug);
			expect(result.title).toBe("Pool");
			expect(result.poolId).toBe(poolId);
		}
	});

	it("validateToken allows reuse of the same token", async () => {
		const t = convexTest(schema, modules);
		const { poolId, slug } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		await t.mutation(api.adminLoginTokens.createAdminLoginToken, {
			poolId,
			tokenHash: "reuse-token",
		});
		// First use
		const first = await t.mutation(
			api.adminLoginTokens.validateToken,
			{ tokenHash: "reuse-token" },
		);
		expect(first.success).toBe(true);
		// Second use — should still succeed
		const second = await t.mutation(
			api.adminLoginTokens.validateToken,
			{ tokenHash: "reuse-token" },
		);
		expect(second.success).toBe(true);
		if (second.success) {
			expect(second.slug).toBe(slug);
			expect(second.poolId).toBe(poolId);
		}
	});

	it("validateToken returns error when token expired", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		await t.mutation(api.adminLoginTokens.createAdminLoginToken, {
			poolId,
			tokenHash: "expired-token",
		});
		// Backdate the token in the DB so it's expired
		await t.run(async (ctx) => {
			const token = await ctx.db
				.query("adminLoginTokens")
				.withIndex("by_tokenHash", (q) => q.eq("tokenHash", "expired-token"))
				.first();
			if (token) {
				await ctx.db.patch(token._id, { expiresAt: Date.now() - 1000 });
			}
		});
		const result = await t.mutation(
			api.adminLoginTokens.validateToken,
			{ tokenHash: "expired-token" },
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toMatch(/expired/);
		}
	});
});
