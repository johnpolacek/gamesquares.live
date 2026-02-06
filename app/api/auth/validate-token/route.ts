import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

// Cookie settings
const ADMIN_COOKIE_PREFIX = "gamesquares_admin_";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export async function POST(request: NextRequest) {
	try {
		const { token } = await request.json();

		if (!token || typeof token !== "string") {
			return NextResponse.json(
				{ success: false, error: "Token is required" },
				{ status: 400 },
			);
		}

		// Hash the token server-side
		const tokenHash = createHash("sha256").update(token).digest("hex");

		// Validate with Convex
		const result = await fetchMutation(api.adminLoginTokens.validateAndConsumeToken, {
			tokenHash,
		});

		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: 400 },
			);
		}

		// Create response with redirect URL
		const response = NextResponse.json({
			success: true,
			slug: result.slug,
			redirectUrl: `/go/${result.slug}`,
		});

		// Set HttpOnly cookie for admin session
		response.cookies.set(`${ADMIN_COOKIE_PREFIX}${result.slug}`, "true", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: COOKIE_MAX_AGE,
			path: "/",
		});

		return response;
	} catch (error) {
		console.error("Token validation error:", error);
		return NextResponse.json(
			{ success: false, error: "Something went wrong" },
			{ status: 500 },
		);
	}
}
