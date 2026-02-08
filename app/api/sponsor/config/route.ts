import { NextResponse } from "next/server";

function formatUsdFromCents(amountCents: number): string {
	const dollars = amountCents / 100;
	// If whole dollars, show "$10" not "$10.00"
	if (Number.isInteger(dollars)) return `$${dollars}`;
	return `$${dollars.toFixed(2)}`;
}

export async function GET() {
	const poolsCountRaw = process.env.SPONSOR_POOLS_COUNT;
	const amountCentsRaw = process.env.STRIPE_SPONSOR_AMOUNT_CENTS;

	const poolsCount = poolsCountRaw ? Number(poolsCountRaw) : NaN;
	const amountCents = amountCentsRaw ? Number(amountCentsRaw) : NaN;

	if (
		!Number.isFinite(poolsCount) ||
		poolsCount <= 0 ||
		!Number.isFinite(amountCents) ||
		amountCents <= 0
	) {
		return NextResponse.json(
			{ error: "Sponsor config is not set" },
			{ status: 500 },
		);
	}

	return NextResponse.json({
		poolsCount,
		displayPrice: formatUsdFromCents(amountCents),
	});
}

