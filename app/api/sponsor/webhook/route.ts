import { fetchAction } from "convex/nextjs";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { api } from "@/convex/_generated/api";
import { SPONSOR_POOLS_COUNT } from "@/lib/sponsor-config";

export async function POST(request: Request) {
	const secretKey = process.env.STRIPE_SECRET_KEY;
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
	const sponsorSecret = process.env.SPONSOR_WEBHOOK_SECRET;

	if (!secretKey || !webhookSecret || !sponsorSecret) {
		return NextResponse.json(
			{ error: "Stripe webhook is not configured" },
			{ status: 500 },
		);
	}

	const stripe = new Stripe(secretKey);

	const body = await request.text();
	const sig = request.headers.get("stripe-signature");

	if (!sig) {
		return NextResponse.json(
			{ error: "Missing stripe-signature header" },
			{ status: 400 },
		);
	}

	let event: Stripe.Event;
	try {
		event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Webhook signature verification failed";
		return NextResponse.json({ error: message }, { status: 400 });
	}

	if (event.type === "checkout.session.completed") {
		const session = event.data.object as Stripe.Checkout.Session;
		const poolsCount = Number(session.metadata?.pools_count) || SPONSOR_POOLS_COUNT;
		const idempotencyKey =
			(session.payment_intent as string) ?? session.id;

		try {
			await fetchAction(api.sponsor.fulfillSponsorship, {
				secret: sponsorSecret,
				amount: poolsCount,
				idempotencyKey,
			});
		} catch (err) {
			console.error("[sponsor/webhook] fulfillSponsorship failed:", err);
			return NextResponse.json(
				{ error: "Failed to fulfil sponsorship" },
				{ status: 500 },
			);
		}
	}

	return NextResponse.json({ received: true });
}
