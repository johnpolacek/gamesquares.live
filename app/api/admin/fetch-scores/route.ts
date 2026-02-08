import { fetchAction } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";

/**
 * POST /api/admin/fetch-scores
 * Validates GLOBAL_ADMIN_SECRET and triggers the real fetchAndUpdateScores action.
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const secret =
			typeof body.secret === "string" ? body.secret.trim() : "";

		if (!secret) {
			return NextResponse.json(
				{ error: "secret is required" },
				{ status: 400 },
			);
		}

		// Validate secret against env var
		const expected = process.env.GLOBAL_ADMIN_SECRET;
		if (!expected || secret !== expected) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const result = await fetchAction(
			api.nflScores.fetchAndUpdateScores,
			{},
		);
		return NextResponse.json(result);
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Score fetch failed";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
