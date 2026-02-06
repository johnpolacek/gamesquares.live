import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "../convex-test-setup";

describe("participants", () => {
	it("joinPool creates new participant and returns participantId", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		const result = await t.mutation(api.participants.joinPool, {
			poolId,
			displayName: "Alice",
		});
		expect(result.participantId).toBeDefined();
		expect(result.displayName).toBe("Alice");
	});

	it("joinPool returns same participant when same displayName re-joins", async () => {
		const t = convexTest(schema, modules);
		const { poolId } = await t.mutation(api.pools.createPool, {
			title: "Pool",
			adminEmail: "a@b.com",
			maxSquaresPerPerson: 5,
		});
		const first = await t.mutation(api.participants.joinPool, {
			poolId,
			displayName: "Alice",
		});
		const second = await t.mutation(api.participants.joinPool, {
			poolId,
			displayName: "Alice",
		});
		expect(second.participantId).toBe(first.participantId);
		expect(second.displayName).toBe("Alice");
	});
});
