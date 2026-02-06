import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";

/**
 * Readiness check: returns 200 when Convex is reachable.
 * Used by Playwright webServer so E2E tests don't start until Convex is ready.
 */
export async function GET() {
	try {
		await fetchQuery(api.games.getCurrentGame, {});
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ ok: false }, { status: 503 });
	}
}