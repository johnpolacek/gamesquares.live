import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "../convex-test-setup";

const quarters = [
	{ label: "Q1", rowTeamScore: 7, colTeamScore: 3 },
	{ label: "Q2", rowTeamScore: 14, colTeamScore: 10 },
];

describe("games", () => {
	it("getCurrentGame returns found: false when no game", async () => {
		const t = convexTest(schema, modules);
		const result = await t.query(api.games.getCurrentGame, {});
		expect(result.found).toBe(false);
	});

	it("getCurrentGame returns latest game when games exist", async () => {
		const t = convexTest(schema, modules);
		await t.run(async (ctx) => {
			await ctx.db.insert("games", {
				name: "Older",
				quarters: [{ label: "Q1", rowTeamScore: 0, colTeamScore: 0 }],
				updatedAt: 1000,
				source: "manual",
			});
			await ctx.db.insert("games", {
				name: "Latest",
				quarters,
				updatedAt: 2000,
				source: "manual",
			});
		});
		const result = await t.query(api.games.getCurrentGame, {});
		expect(result.found).toBe(true);
		if (result.found) {
			expect(result.game.name).toBe("Latest");
			expect(result.game.quarters).toEqual(quarters);
			expect(result.game.source).toBe("manual");
		}
	});

	it("setScoresManual returns Unauthorized when secret is wrong", async () => {
		const t = convexTest(schema, modules);
		const result = await t.mutation(api.games.setScoresManual, {
			adminSecret: "wrong",
			name: "Test",
			quarters,
		});
		expect(result.ok).toBe(false);
		expect(result.error).toBe("Unauthorized");
	});

	it("setScoresManual inserts game when secret matches", async () => {
		const t = convexTest(schema, modules);
		const secret = "test-admin-secret";
		const orig = process.env.GLOBAL_ADMIN_SECRET;
		process.env.GLOBAL_ADMIN_SECRET = secret;
		try {
			const result = await t.mutation(api.games.setScoresManual, {
				adminSecret: secret,
				name: "Super Bowl",
				quarters,
			});
			expect(result.ok).toBe(true);
			const current = await t.query(api.games.getCurrentGame, {});
			expect(current.found).toBe(true);
			if (current.found) {
				expect(current.game.name).toBe("Super Bowl");
				expect(current.game.quarters).toEqual(quarters);
			}
		} finally {
			if (orig !== undefined) {
				process.env.GLOBAL_ADMIN_SECRET = orig;
			} else {
				delete process.env.GLOBAL_ADMIN_SECRET;
			}
		}
	});
});
