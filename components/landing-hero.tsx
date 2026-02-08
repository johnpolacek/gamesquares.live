"use client";

import { useQuery } from "convex/react";
import { PlusIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { api } from "@/convex/_generated/api";
import {
	getPoolHistory,
	type PoolHistoryEntry,
	removePoolFromHistory,
} from "@/lib/pool-history";

type SponsorConfig = {
	poolsCount: number;
	displayPrice: string;
};

const squareOptions = [1, 2, 4, 5, 10];
const CREATED_AT_KEY = "gamesquares_pool_created_at";
const DEV_POOL_LINK_KEY = "gamesquares_dev_pool_link";
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

/** One row per pool: merge admin + player entries, show Play + Manage when user is creator */
type MergedPool = {
	slug: string;
	title: string;
	isAdmin: boolean;
	joinedAt: number;
};

function mergePoolsBySlug(pools: PoolHistoryEntry[]): MergedPool[] {
	const bySlug = new Map<string, MergedPool>();
	for (const entry of pools) {
		const existing = bySlug.get(entry.slug);
		const isAdmin = entry.role === "admin";
		if (!existing) {
			bySlug.set(entry.slug, {
				slug: entry.slug,
				title: entry.title,
				isAdmin,
				joinedAt: entry.joinedAt,
			});
		} else {
			bySlug.set(entry.slug, {
				...existing,
				isAdmin: existing.isAdmin || isAdmin,
				joinedAt: Math.max(existing.joinedAt, entry.joinedAt),
			});
		}
	}
	const merged = [...bySlug.values()].sort((a, b) => b.joinedAt - a.joinedAt);
	return merged;
}

function YourPools({
	pools,
	onRemove,
}: {
	pools: PoolHistoryEntry[];
	onRemove: (slug: string) => void;
}) {
	const merged = mergePoolsBySlug(pools);
	if (merged.length === 0) return null;
	if (
		process.env.NODE_ENV === "development" &&
		typeof window !== "undefined" &&
		(window.location?.search?.includes("debug=pools") ||
			localStorage.getItem("gamesquares_debug_pools") === "1")
	) {
		console.log("[YourPools] debug", {
			poolHistory: pools,
			merged: merged.map((p) => ({
				slug: p.slug,
				title: p.title,
				isAdmin: p.isAdmin,
			})),
		});
	}
	return (
		<section className="w-full max-w-md opacity-0 animate-fade-in-up">
			<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
				Your Pools
			</h3>
			<div className="flex flex-col gap-3 min-w-[270px]">
				{merged.map((pool) => (
					<div
						key={pool.slug}
						className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0 flex-1">
								<p className="truncate text-base font-semibold text-foreground">
									{pool.title}
								</p>
								<span
									className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${
										pool.isAdmin
											? "bg-primary/15 text-primary"
											: "bg-muted text-muted-foreground"
									}`}
								>
									{pool.isAdmin ? "You created this" : "Player"}
								</span>
							</div>
							<button
								type="button"
								onClick={() => onRemove(pool.slug)}
								className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
								aria-label={`Remove ${pool.title} from list`}
							>
								<XIcon className="h-4 w-4" />
							</button>
						</div>
						<div className="flex flex-wrap justify-center gap-2">
							<Link
								href={`/play/${pool.slug}`}
								className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
							>
								Play
							</Link>
							{pool.isAdmin && (
								<Link
									href={`/go/${pool.slug}`}
									className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
								>
									Manage
								</Link>
							)}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}

function FooterLinks() {
	return (
		<footer className="flex flex-col items-center gap-8 pt-8">
			<Link
				href="/demo"
				className="text-xl font-light text-primary border-b-2 border-primary/50 hover:border-primary/90 border-dotted transition-colors hover:text-primary/90"
			>
				See how it works
			</Link>
			<div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
				<Link href="/privacy" className="hover:text-foreground underline">
					Privacy Policy
				</Link>
				<span>&middot;</span>
				<Link href="/terms" className="hover:text-foreground underline">
					Terms of Use
				</Link>
			</div>
			<p className="text-[10px] text-muted-foreground/60 text-center max-w-xs">
				Protected by reCAPTCHA.{" "}
				<a
					href="https://policies.google.com/privacy"
					className="underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Privacy
				</a>
				{" & "}
				<a
					href="https://policies.google.com/terms"
					className="underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Terms
				</a>{" "}
				apply.
			</p>
		</footer>
	);
}

export function LandingHero() {
	const poolCount = useQuery(api.pools.getPoolCount, {});
	const { executeRecaptcha } = useGoogleReCaptcha();
	const [step, setStep] = useState<"hero" | "configure" | "success">("hero");
	const [createdAt, setCreatedAt] = useState<number | null>(null);
	const [devPoolLink, setDevPoolLink] = useState<string | null>(null);
	const [poolHistory, setPoolHistory] = useState<PoolHistoryEntry[]>([]);
	const [title, setTitle] = useState("");
	const [adminEmail, setAdminEmail] = useState("");
	const [squaresPerPerson, setSquaresPerPerson] = useState(5);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showSponsor, setShowSponsor] = useState(false);
	const [sponsorLoading, setSponsorLoading] = useState(false);
	const searchParams = useSearchParams();
	const [sponsorConfig, setSponsorConfig] = useState<SponsorConfig | null>(
		null,
	);

	const totalPlayers = 100 / squaresPerPerson;
	const [, setTick] = useState(0);
	const canCreateNew =
		createdAt !== null && Date.now() - createdAt > COOLDOWN_MS;

	useEffect(() => {
		if (typeof window === "undefined") return;
		const raw = localStorage.getItem(CREATED_AT_KEY);
		if (raw) {
			const ts = Number.parseInt(raw, 10);
			if (!Number.isNaN(ts)) setCreatedAt(ts);
		}
		const link = localStorage.getItem(DEV_POOL_LINK_KEY);
		if (link) setDevPoolLink(link);
		setPoolHistory(getPoolHistory());
		if (process.env.NODE_ENV === "development") {
			console.log("[LandingHero] localStorage on mount:", {
				CREATED_AT_KEY: raw,
				DEV_POOL_LINK_KEY: link ? `${link.slice(0, 40)}...` : null,
				hasPoolLink: !!link,
			});
		}
	}, []);

	// When within cooldown, re-render when it expires so the button appears
	useEffect(() => {
		if (createdAt === null || Date.now() - createdAt > COOLDOWN_MS) return;
		const remaining = COOLDOWN_MS - (Date.now() - createdAt);
		const t = setTimeout(() => setTick((n) => n + 1), remaining);
		return () => clearTimeout(t);
	}, [createdAt]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch("/api/sponsor/config");
				const data = await res.json();
				if (!res.ok) return;
				if (
					typeof data?.poolsCount === "number" &&
					Number.isFinite(data.poolsCount) &&
					typeof data?.displayPrice === "string"
				) {
					if (!cancelled) {
						setSponsorConfig({
							poolsCount: data.poolsCount,
							displayPrice: data.displayPrice,
						});
					}
				}
			} catch {
				// ignore: sponsor config is optional until rate-limit is hit
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const handleCreatePool = useCallback(async () => {
		const trimmedTitle = title.trim();
		const trimmedEmail = adminEmail.trim();
		if (!trimmedTitle || !trimmedEmail) {
			setError("Pool title and admin email are required.");
			return;
		}
		setError(null);
		setShowSponsor(false);
		setLoading(true);
		try {
			// Get reCAPTCHA token (if available; gracefully skip on failure)
			let captchaToken: string | undefined;
			if (executeRecaptcha) {
				try {
					captchaToken = await executeRecaptcha("create_pool");
				} catch {
					// reCAPTCHA may fail in test/headless environments — continue without token
				}
			}

			const res = await fetch("/api/pools", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: trimmedTitle,
					adminEmail: trimmedEmail,
					maxSquaresPerPerson: squaresPerPerson,
					captchaToken,
				}),
			});
			const data = await res.json();
			if (process.env.NODE_ENV === "development") {
				console.log("[LandingHero] create pool response:", {
					ok: res.ok,
					hasPoolLink: "poolLink" in data && !!data.poolLink,
					keys: Object.keys(data),
				});
			}
			if (!res.ok) {
				setError(data.error ?? "Failed to create pool");
				if (res.status === 429) {
					setShowSponsor(true);
				}
				return;
			}
			const now = Date.now();
			if (typeof window !== "undefined") {
				localStorage.setItem(CREATED_AT_KEY, String(now));
				if (data.poolLink) {
					localStorage.setItem(DEV_POOL_LINK_KEY, data.poolLink);
					setDevPoolLink(data.poolLink);
				}
			}
			// Don't add to pool history yet — pool only appears in "Your Pools"
			// after the user verifies via the email magic link on /go
			setCreatedAt(now);
			if (data.poolLink) setDevPoolLink(data.poolLink);
			setStep("success");
		} catch {
			setError("Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [title, adminEmail, squaresPerPerson, executeRecaptcha]);

	const handleCreateNewPool = () => {
		if (typeof window !== "undefined") {
			localStorage.removeItem(CREATED_AT_KEY);
			localStorage.removeItem(DEV_POOL_LINK_KEY);
		}
		setCreatedAt(null);
		setDevPoolLink(null);
		setStep("hero");
	};

	const handleRemovePool = (slug: string) => {
		removePoolFromHistory(slug, "admin");
		removePoolFromHistory(slug, "player");
		setPoolHistory(getPoolHistory());
	};

	const handleSponsor = useCallback(async () => {
		setSponsorLoading(true);
		try {
			const res = await fetch("/api/sponsor/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});
			const data = await res.json();
			if (!res.ok || !data.url) {
				setError(data.error ?? "Unable to start checkout. Try again.");
				return;
			}
			window.location.href = data.url;
		} catch {
			setError("Something went wrong starting checkout.");
		} finally {
			setSponsorLoading(false);
		}
	}, []);

	// Detect returning from a sponsor checkout
	const sponsorStatus = searchParams.get("sponsor");
	const [sponsorMessage, setSponsorMessage] = useState<string | null>(null);
	useEffect(() => {
		if (sponsorStatus === "success") {
			setSponsorMessage("Thanks for sponsoring! You can create your pool now.");
			// Clean up the URL param
			const url = new URL(window.location.href);
			url.searchParams.delete("sponsor");
			window.history.replaceState({}, "", url.toString());
		}
	}, [sponsorStatus]);

	// Success: show pool link only if API returned it (e.g. in development)
	if (step === "success") {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
				<div className="flex w-full max-w-md flex-col gap-8 text-center opacity-0 animate-fade-in-up">
					<div className="flex flex-col gap-2">
						<h2
							data-testid="landing-success-heading"
							className="font-mono text-xl font-bold text-foreground"
						>
							Check your email
						</h2>
						<p className="text-sm text-muted-foreground">
							We sent a link to your email. Click it to activate your admin
							access and start managing your pool.
						</p>
					</div>
					<YourPools pools={poolHistory} onRemove={handleRemovePool} />
					<FooterLinks />
					{devPoolLink && (
						<div className="rounded-lg mt-8 border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-left">
							<p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
								Dev bypass
							</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Admin link is in the server terminal. Open pool:
							</p>
							<a
								href={devPoolLink}
								className="mt-2 block truncate text-sm font-medium text-primary underline"
							>
								{devPoolLink}
							</a>
						</div>
					)}
				</div>
			</main>
		);
	}

	// Returning user: they already created a pool within 15 min (no button) or after (show create new)
	if (createdAt !== null && step === "hero") {
		const hasVerifiedAdmin = poolHistory.some((p) => p.role === "admin");
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
				<div className="flex w-full max-w-md flex-col gap-8 text-center opacity-0 animate-fade-in-up">
					<div className="flex flex-col gap-2">
						<h2 className="font-mono text-xl text-balance font-bold text-foreground">
							{hasVerifiedAdmin
								? "Welcome back!"
								: "You already created a GameSquares pool"}
						</h2>
						{!hasVerifiedAdmin && (
							<p className="text-sm text-balance text-muted-foreground">
								Check your email for the link to activate your admin access.
							</p>
						)}
					</div>
					{canCreateNew && (
						<button
							onClick={handleCreateNewPool}
							className="flex gap-2 items-center justify-center w-full rounded-lg bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground shadow-sm transition-all active:scale-[0.98]"
							type="button"
						>
							<PlusIcon className="w-4 h-4" /> Create another pool
						</button>
					)}
					<YourPools pools={poolHistory} onRemove={handleRemovePool} />
					<FooterLinks />
					{devPoolLink && (
						<div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-left mt-8">
							<p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
								Dev bypass
							</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Admin link is in the server terminal. Open pool:
							</p>
							<a
								href={devPoolLink}
								className="mt-2 block truncate text-sm font-medium text-primary underline"
							>
								{devPoolLink}
							</a>
						</div>
					)}
				</div>
			</main>
		);
	}

	if (step === "configure") {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
				<div className="flex w-full max-w-md flex-col gap-8 opacity-0 animate-fade-in-up">
					<button
						onClick={() => setStep("hero")}
						className="flex items-center gap-1 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
						type="button"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							aria-hidden="true"
						>
							<path
								d="M10 12L6 8L10 4"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						Back
					</button>

					<div className="flex flex-col gap-2">
						<h2 className="font-mono text-xl font-bold text-foreground">
							Set up your pool
						</h2>
						<p className="text-sm text-muted-foreground">
							We’ll send your admin link to the email below. No account needed.
						</p>
					</div>

					<div className="flex flex-col gap-3">
						<label
							htmlFor="pool-title"
							className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
						>
							Pool title
						</label>
						<input
							id="pool-title"
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. Smith Family Squares"
							maxLength={60}
							className="w-full rounded-lg bg-card px-4 py-3 text-base text-foreground ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>

					<div className="flex flex-col gap-3">
						<label
							htmlFor="admin-email"
							className="text-xs font-medium tracking-wide uppercase text-muted-foreground"
						>
							Your email (admin link will be sent here)
						</label>
						<input
							id="admin-email"
							type="email"
							value={adminEmail}
							onChange={(e) => setAdminEmail(e.target.value)}
							placeholder="Enter your email"
							className="w-full rounded-lg bg-card px-4 py-3 text-base text-foreground ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>

					<div className="flex flex-col gap-3">
						<span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
							Squares per player
						</span>
						<div className="flex gap-2">
							{squareOptions.map((num) => (
								<button
									key={num}
									onClick={() => setSquaresPerPerson(num)}
									className={`flex h-12 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-all ${
										squaresPerPerson === num
											? "bg-primary text-primary-foreground shadow-sm"
											: "bg-card text-card-foreground ring-1 ring-border"
									}`}
									type="button"
								>
									{num}
								</button>
							))}
						</div>
					</div>

					<div className="rounded-lg bg-card p-4 ring-1 ring-border">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">
								Total squares
							</span>
							<span className="text-sm font-semibold tabular-nums text-card-foreground">
								100
							</span>
						</div>
						<div className="my-3 h-px bg-border" />
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Max players</span>
							<span
								key={`players-${totalPlayers}`}
								className="text-sm font-semibold tabular-nums text-card-foreground animate-score-pop"
							>
								{totalPlayers}
							</span>
						</div>
					</div>

					{sponsorMessage && (
						<output className="block rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400 animate-fade-in-up">
							{sponsorMessage}
						</output>
					)}

					{error && (
						<p
							className="text-sm text-destructive animate-fade-in-up"
							role="alert"
						>
							{error}
						</p>
					)}

					{showSponsor &&
						(() => {
							const count = sponsorConfig?.poolsCount ?? 100;
							const price = sponsorConfig?.displayPrice ?? "$5";
							const othersCount = Math.max(0, count - 1);
							return (
								<div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 animate-fade-in-up">
									<p className="text-sm font-medium text-foreground">
										We're at capacity — but you can change that.
									</p>
									<p className="text-sm text-foreground">
										For <strong>{price}</strong> you sponsor the next{" "}
										<strong>{count} pool creations</strong>. That's{" "}
										<strong>{othersCount} other groups</strong> who get to play
										for free because of you — and you get to create yours right
										after.
									</p>
									<button
										data-testid="sponsor-cta"
										onClick={handleSponsor}
										disabled={sponsorLoading}
										className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
										type="button"
									>
										{sponsorLoading
											? "Redirecting…"
											: `Unlock the next ${count} — ${price}`}
									</button>
								</div>
							);
						})()}

					<button
						data-testid="landing-create-pool-submit"
						onClick={handleCreatePool}
						disabled={loading}
						className={`w-full rounded-lg bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 ${loading ? "animate-subtle-pulse" : ""}`}
						type="button"
					>
						{loading ? "Creating…" : "Create Pool"}
					</button>
					<FooterLinks />
					{devPoolLink && (
						<div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 mt-8 text-left">
							<p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
								Dev bypass
							</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Admin link is in the server terminal. Open pool:
							</p>
							<a
								href={devPoolLink}
								className="mt-2 block truncate text-sm font-medium text-primary underline"
							>
								{devPoolLink}
							</a>
						</div>
					)}
				</div>
			</main>
		);
	}

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
			<div className="flex w-full max-w-md flex-col items-center gap-10 text-center">
				<div className="flex flex-col items-center gap-3 opacity-0 animate-fade-in-up">
					<div className="flex items-center gap-2 relative -top-8">
						<svg
							width="32"
							height="32"
							viewBox="0 0 32 32"
							fill="none"
							className="text-primary"
							aria-hidden="true"
						>
							<rect
								x="2"
								y="2"
								width="12"
								height="12"
								rx="2"
								fill="currentColor"
								opacity="0.9"
							/>
							<rect
								x="18"
								y="2"
								width="12"
								height="12"
								rx="2"
								fill="currentColor"
								opacity="0.6"
							/>
							<rect
								x="2"
								y="18"
								width="12"
								height="12"
								rx="2"
								fill="currentColor"
								opacity="0.6"
							/>
							<rect
								x="18"
								y="18"
								width="12"
								height="12"
								rx="2"
								fill="currentColor"
								opacity="0.3"
							/>
						</svg>
						<h1 className="font-mono text-4xl font-bold tracking-tight text-foreground">
							GameSquares
							<span className="opacity-50 text-xl tracking-tight">.live</span>
						</h1>
					</div>
				</div>

				<button
					data-testid="landing-create-pool-cta"
					onClick={() => setStep("configure")}
					className="flex justify-center items-center gap-2 rounded-lg bg-primary px-6 py-4 text-xl font-semibold text-primary-foreground shadow-sm transition-all active:scale-[0.98] opacity-0 animate-fade-in-up animate-delay-1"
					type="button"
				>
					<PlusIcon className="w-6 h-6" /> Create GameSquares Pool
				</button>

				<p className="text-sm text-muted-foreground opacity-0 animate-fade-in-up animate-delay-2">
					No account needed. Create and share in seconds.
				</p>
				{poolCount !== undefined && poolCount > 0 && (
					<p className="text-sm text-muted-foreground opacity-0 animate-fade-in-up animate-delay-3">
						<span
							key={poolCount}
							className="font-mono font-bold tabular-nums text-foreground animate-score-pop"
						>
							{poolCount.toLocaleString()}
						</span>{" "}
						{poolCount === 1 ? "pool" : "pools"} created
					</p>
				)}
				{poolHistory.length > 0 && (
					<div className="opacity-0 animate-fade-in-up animate-delay-3">
						<YourPools pools={poolHistory} onRemove={handleRemovePool} />
					</div>
				)}
				<div className="opacity-0 animate-fade-in-up animate-delay-4">
					<FooterLinks />
				</div>
			</div>
		</main>
	);
}
