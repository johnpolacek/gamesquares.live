import { NextResponse } from "next/server";
import Stripe from "stripe";
import { SPONSOR_POOLS_COUNT } from "@/lib/sponsor-config";

export async function POST(request: Request) {
	try {
		const secretKey = process.env.STRIPE_SECRET_KEY;
		const amountCentsRaw = process.env.STRIPE_SPONSOR_AMOUNT_CENTS;
		const currency = "usd";
		const productName = `Sponsor ${SPONSOR_POOLS_COUNT} pool creations`;

		const amountCents = amountCentsRaw ? Number(amountCentsRaw) : NaN;

		if (!secretKey || !Number.isFinite(amountCents) || amountCents <= 0) {
			return NextResponse.json(
				{ error: "Stripe is not configured" },
				{ status: 500 },
			);
		}

		const stripe = new Stripe(secretKey);

		const rawOrigin =
			request.headers.get("origin") ??
			request.url.replace(/\/api\/sponsor.*$/, "");

		const body = await request.json().catch(() => ({}));
		const successUrl =
			typeof body.successUrl === "string"
				? body.successUrl
				: `${rawOrigin}/?sponsor=success`;
		const cancelUrl =
			typeof body.cancelUrl === "string"
				? body.cancelUrl
				: `${rawOrigin}/?sponsor=cancel`;

		const session = await stripe.checkout.sessions.create({
			mode: "payment",
			line_items: [
				{
					price_data: {
						currency,
						unit_amount: amountCents,
						product_data: { name: productName },
					},
					quantity: 1,
				},
			],
			success_url: successUrl,
			cancel_url: cancelUrl,
			metadata: {
				pools_count: String(SPONSOR_POOLS_COUNT),
			},
		});

		return NextResponse.json({ url: session.url });
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to create checkout session";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
