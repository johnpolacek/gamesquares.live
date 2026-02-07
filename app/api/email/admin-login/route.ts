import { NextResponse } from "next/server";
import { sendAdminLoginEmail } from "@/lib/email";
import { ROUTES } from "@/lib/types";

/**
 * Sends the admin magic link email. Used after pool creation and for resend.
 * Server-only: token must never be exposed to the client.
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const slug = typeof body.slug === "string" ? body.slug.trim() : "";
		const adminLoginToken =
			typeof body.adminLoginToken === "string" ? body.adminLoginToken : "";
		const adminEmail =
			typeof body.adminEmail === "string"
				? body.adminEmail.trim().toLowerCase()
				: "";

		if (!slug || !adminLoginToken || !adminEmail) {
			return NextResponse.json(
				{ error: "slug, adminLoginToken, and adminEmail are required" },
				{ status: 400 },
			);
		}

		const origin =
			request.headers.get("origin") ??
			request.url.replace(/\/api\/email\/admin-login.*$/, "");
		const adminLoginLink = `${origin}${ROUTES.ADMIN_LOGIN_PREFIX}?token=${adminLoginToken}`;
		const poolLink = `${origin}${ROUTES.PLAY_PREFIX}${slug}`;
		const viewLink = `${origin}${ROUTES.VIEW_PREFIX}${slug}`;

		const result = await sendAdminLoginEmail({
			to: adminEmail,
			adminLoginLink,
			poolLink,
			viewLink,
		});

		if (!result.ok) {
			return NextResponse.json(
				{ error: result.error ?? "Failed to send email" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json(
			{ error: "Failed to send email" },
			{ status: 500 },
		);
	}
}
