import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_COOKIE_PREFIX = "gamesquares_admin_";

export async function GET(request: NextRequest) {
	const slug = request.nextUrl.searchParams.get("slug");
	if (!slug || typeof slug !== "string") {
		return NextResponse.json({ ok: false }, { status: 400 });
	}

	const cookieName = `${ADMIN_COOKIE_PREFIX}${slug}`;
	const cookie = request.cookies.get(cookieName);
	const ok = cookie?.value === "true";

	return NextResponse.json({ ok });
}
