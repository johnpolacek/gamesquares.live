import { fetchMutation } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";

type Quarter = {
	label: string;
	rowTeamScore: number;
	colTeamScore: number;
	complete?: boolean;
};

function parseQuarters(body: unknown): Quarter[] | null {
	if (!Array.isArray(body)) return null;
	return body.every(
		(q) =>
			typeof q === "object" &&
			q !== null &&
			typeof (q as Quarter).label === "string" &&
			typeof (q as Quarter).rowTeamScore === "number" &&
			typeof (q as Quarter).colTeamScore === "number",
	)
		? (body as Quarter[])
		: null;
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const secret =
			typeof body.secret === "string" ? body.secret.trim() : "";
		const name =
			typeof body.name === "string" ? body.name.trim() : "Global Game";
		const quarters = parseQuarters(body.quarters);
		const gameComplete =
			typeof body.gameComplete === "boolean" ? body.gameComplete : undefined;

		if (!secret) {
			return NextResponse.json(
				{ error: "secret is required" },
				{ status: 400 },
			);
		}
		if (!quarters || quarters.length === 0) {
			return NextResponse.json(
				{ error: "quarters array is required" },
				{ status: 400 },
			);
		}

		const result = await fetchMutation(api.games.setScoresManual, {
			adminSecret: secret,
			name,
			quarters,
			gameComplete,
		});

		if (!result.ok) {
			return NextResponse.json(
				{ error: result.error ?? "Unauthorized" },
				{ status: 401 },
			);
		}
		return NextResponse.json({ ok: true });
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to set scores";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
