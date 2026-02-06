import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const ADMIN_COOKIE_PREFIX = "gamesquares_admin_";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function isLocalhost(request: NextRequest): boolean {
	const host = request.headers.get("host") ?? "";
	const urlHost = (() => {
		try {
			return new URL(request.url).hostname;
		} catch {
			return "";
		}
	})();
	const isDevOrTest =
		process.env.NODE_ENV === "development" ||
		process.env.NODE_ENV === "test";
	return (
		isDevOrTest &&
		(/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(host) ||
			/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(urlHost))
	);
}

export async function GET(request: NextRequest) {
	if (!isLocalhost(request)) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	const slug = request.nextUrl.searchParams.get("slug");
	if (!slug || typeof slug !== "string" || !/^[a-z0-9]+$/i.test(slug)) {
		return NextResponse.json(
			{ error: "Valid slug query parameter is required" },
			{ status: 400 },
		);
	}

	// Verify pool exists
	const result = await fetchQuery(api.pools.getPoolBySlug, { slug });
	if (!result.found) {
		return NextResponse.json({ error: "Pool not found" }, { status: 404 });
	}

	const response = NextResponse.redirect(new URL(`/go/${slug}`, request.url));
	response.cookies.set(`${ADMIN_COOKIE_PREFIX}${slug}`, "true", {
		httpOnly: true,
		secure: false,
		sameSite: "strict",
		maxAge: COOKIE_MAX_AGE,
		path: "/",
	});

	return response;
}
