import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "../convex-test-setup";

describe("pools", () => {
	it("createPool returns slug and poolId and creates 100 squares", async () => {
		const t = convexTest(schema, modules);
		const result = await t.mutation(api.pools.createPool, {
			title: "Test Pool",
			adminEmail: "admin@test.com",
			maxSquaresPerPerson: 5,
		});
		expect(result.slug).toBeDefined();
		expect(result.slug.length).toBe(8);
		expect(result.poolId).toBeDefined();

		const data = await t.query(api.pools.getPoolBySlug, { slug: result.slug });
		expect(data.found).toBe(true);
		if (data.found) {
			expect(data.pool.slug).toBe(result.slug);
			expect(data.pool.title).toBe("Test Pool");
			expect(data.pool.maxSquaresPerPerson).toBe(5);
			expect(data.squares).toHaveLength(100);
			expect(data.participants).toHaveLength(0);
		}
	});

	it("createPool throws when admin email is empty", async () => {
		const t = convexTest(schema, modules);
		await expect(
			t.mutation(api.pools.createPool, {
				title: "Test",
				adminEmail: "   ",
				maxSquaresPerPerson: 5,
			}),
		).rejects.toThrow();
	});

	it("createPool respects global limit", async () => {
		const t = convexTest(schema, modules);
		// Seed globalLimits at cap (100)
		await t.run(async (ctx) => {
			await ctx.db.insert("globalLimits", {
				windowStart: Date.now(),
				createdCount: 100,
				bonusCapacity: 0,
				bonusExpiresAt: 0,
			});
		});
		await expect(
			t.mutation(api.pools.createPool, {
				title: "Over cap",
				adminEmail: "a@b.com",
				maxSquaresPerPerson: 5,
			}),
		).rejects.toThrow();
	});

	it("getPoolBySlug returns found: false for unknown slug", async () => {
		const t = convexTest(schema, modules);
		const result = await t.query(api.pools.getPoolBySlug, {
			slug: "nonexist",
		});
		expect(result.found).toBe(false);
	});

	it("updateMaxSquares allows increase", async () => {
		const t = convexTest(schema, modules);
		const { poolId, slug } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		const result = await t.mutation(api.pools.updateMaxSquares, {
			poolId,
			maxSquaresPerPerson: 10,
		});
		expect(result.ok).toBe(true);
		const data = await t.query(api.pools.getPoolBySlug, { slug });
		expect(data.found && data.pool.maxSquaresPerPerson).toBe(10);
	});

	it("updateMaxSquares blocks decrease when a player has more than new max", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		const { participantId } = await t.mutation(api.participants.joinPool, {
			poolId,
			displayName: "Alice",
		});
		await t.mutation(api.squares.claimSquares, {
			poolId,
			participantId,
			squareIndexes: [0, 1, 2],
		});
		const result = await t.mutation(api.pools.updateMaxSquares, {
			poolId,
			maxSquaresPerPerson: 2,
		});
		expect(result.ok).toBe(false);
		expect(result.error).toContain("3 squares");
	});

	it("assignNumbers returns ok and row/col arrays of 10 digits", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		const result = await t.mutation(api.pools.assignNumbers, { poolId });
		expect(result.ok).toBe(true);
		expect(result.rowNumbers).toHaveLength(10);
		expect(result.colNumbers).toHaveLength(10);
		expect([...new Set(result.rowNumbers!)].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect([...new Set(result.colNumbers!)].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});
});
