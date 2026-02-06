import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "../convex-test-setup";

describe("squares", () => {
	it("claimSquares succeeds and returns claimed indexes", async () => {
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
		const result = await t.mutation(api.squares.claimSquares, {
			poolId,
			participantId,
			squareIndexes: [0, 1, 2],
		});
		expect(result.claimed).toEqual([0, 1, 2]);
	});

	it("claimSquares throws when pool is locked", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		await t.run(async (ctx) => {
			const pool = await ctx.db.get(poolId);
			if (pool) await ctx.db.patch(poolId, { status: "locked" });
		});
		const { participantId } = await t.mutation(api.participants.joinPool, {
			poolId,
			displayName: "Alice",
		});
		await expect(
			t.mutation(api.squares.claimSquares, {
				poolId,
				participantId,
				squareIndexes: [0],
			}),
		).rejects.toThrow(/POOL_LOCKED|locked/);
	});

	it("claimSquares throws when limit reached", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 2,
		});
		const { participantId } = await t.mutation(api.participants.joinPool, {
			poolId,
			displayName: "Alice",
		});
		await t.mutation(api.squares.claimSquares, {
			poolId,
			participantId,
			squareIndexes: [0, 1],
		});
		await expect(
			t.mutation(api.squares.claimSquares, {
				poolId,
				participantId,
				squareIndexes: [2],
			}),
		).rejects.toThrow(/LIMIT_REACHED|claimed/);
	});

	it("claimSquares skips already claimed squares (no double-claim)", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		const { participantId: id1 } = await t.mutation(api.participants.joinPool, {
			poolId,
			displayName: "Alice",
		});
		const { participantId: id2 } = await t.mutation(api.participants.joinPool, {
			poolId,
			displayName: "Bob",
		});
		await t.mutation(api.squares.claimSquares, {
			poolId,
			participantId: id1,
			squareIndexes: [0],
		});
		// Bob tries to claim [0, 1] – 0 is already claimed, so only 1 is claimed
		const result = await t.mutation(api.squares.claimSquares, {
			poolId,
			participantId: id2,
			squareIndexes: [0, 1],
		});
		expect(result.claimed).toEqual([1]);
	});

	it("releaseSquares releases claimed squares", async () => {
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
			squareIndexes: [0, 1],
		});
		const result = await t.mutation(api.squares.releaseSquares, {
			poolId,
			squareIndexes: [0, 1],
		});
		expect(result.released).toEqual([0, 1]);
	});

	it("distributeSquares succeeds and distributes unclaimed to participants", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 100,
		});
		await t.mutation(api.participants.joinPool, { poolId, displayName: "A" });
		await t.mutation(api.participants.joinPool, { poolId, displayName: "B" });
		const result = await t.mutation(api.squares.distributeSquares, { poolId });
		expect(result.ok).toBe(true);
		expect(result.distributed).toBe(100);
	});

	it("distributeSquares returns error when no players", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		const result = await t.mutation(api.squares.distributeSquares, { poolId });
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/no players|joined/);
	});

	it("distributeSquares returns error when all squares claimed", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 100,
		});
		const { participantId } = await t.mutation(api.participants.joinPool, {
			poolId,
			displayName: "Alice",
		});
		await t.mutation(api.squares.claimSquares, {
			poolId,
			participantId,
			squareIndexes: Array.from({ length: 100 }, (_, i) => i),
		});
		const result = await t.mutation(api.squares.distributeSquares, { poolId });
		expect(result.ok).toBe(false);
		expect(result.error).toMatch(/all.*claimed|already claimed/);
	});
});
