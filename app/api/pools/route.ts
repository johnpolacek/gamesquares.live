import { createHash, randomBytes } from "node:crypto";
import { fetchMutation } from "convex/nextjs";
import { ConvexError } from "convex/values";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { sendAdminLoginEmail } from "@/lib/email";
import { ROUTES } from "@/lib/types";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const title = typeof body.title === "string" ? body.title.trim() : "";
		const adminEmail =
			typeof body.adminEmail === "string" ? body.adminEmail.trim() : "";
		const maxSquaresPerPerson =
			typeof body.maxSquaresPerPerson === "number"
				? body.maxSquaresPerPerson
				: 5;

		if (!title || !adminEmail) {
			return NextResponse.json(
				{ error: "Title and admin email are required" },
				{ status: 400 },
			);
		}

		const { slug, poolId } = await fetchMutation(api.pools.createPool, {
			title,
			adminEmail,
			maxSquaresPerPerson,
		});

		const rawToken = randomBytes(32).toString("base64url");
		const tokenHash = createHash("sha256").update(rawToken).digest("hex");

		await fetchMutation(api.adminLoginTokens.createAdminLoginToken, {
			poolId,
			tokenHash,
		});

		const origin =
			request.headers.get("origin") ??
			request.url.replace(/\/api\/pools.*$/, "");
		const adminLoginLink = `${origin}${ROUTES.ADMIN_LOGIN_PREFIX}?token=${rawToken}`;
		const poolLink = `${origin}${ROUTES.PLAY_PREFIX}${slug}`;

		const result = await sendAdminLoginEmail({
			to: adminEmail,
			adminLoginLink,
			poolLink,
		});

		if (!result.ok) {
			return NextResponse.json(
				{ error: result.error ?? "Failed to send email" },
				{ status: 500 },
			);
		}

		// Only expose pool link in development (server is source of truth)
		const host = request.headers.get("host") ?? "";
		const urlHost = (() => {
			try {
				return new URL(request.url).hostname;
			} catch {
				return "";
			}
		})();
		const isDev =
			process.env.NODE_ENV === "development" &&
			(/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(host) ||
				/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(urlHost));

		if (process.env.NODE_ENV === "development") {
			console.log("[api/pools] dev bypass check:", {
				NODE_ENV: process.env.NODE_ENV,
				host,
				urlHost,
				isDev,
				willReturnPoolLink: isDev,
			});
		}

		return NextResponse.json(
			isDev ? { slug, poolLink } : { slug },
		);
	} catch (err) {
		if (err instanceof ConvexError) {
			const data = err.data as { code: string; message: string };
			const status =
				data.code === "RATE_LIMIT"
					? 429
					: data.code === "INVALID_INPUT"
						? 400
						: 500;
			return NextResponse.json({ error: data.message }, { status });
		}
		const message =
			err instanceof Error ? err.message : "Failed to create pool";
		return NextResponse.json(
			{ error: message },
			{ status: message.includes("limit") ? 429 : 500 },
		);
	}
}
