"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const squareOptions = [1, 2, 4, 5, 10];
const CREATED_AT_KEY = "gamesquares_pool_created_at";
const DEV_POOL_LINK_KEY = "gamesquares_dev_pool_link";
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

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
		</footer>
	);
}

export function LandingHero() {
	const [step, setStep] = useState<"hero" | "configure" | "success">("hero");
	const [createdAt, setCreatedAt] = useState<number | null>(null);
	const [devPoolLink, setDevPoolLink] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [adminEmail, setAdminEmail] = useState("");
	const [squaresPerPerson, setSquaresPerPerson] = useState(5);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

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

	const handleCreatePool = async () => {
		const trimmedTitle = title.trim();
		const trimmedEmail = adminEmail.trim();
		if (!trimmedTitle || !trimmedEmail) {
			setError("Pool title and admin email are required.");
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const res = await fetch("/api/pools", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: trimmedTitle,
					adminEmail: trimmedEmail,
					maxSquaresPerPerson: squaresPerPerson,
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
			setCreatedAt(now);
			if (data.poolLink) setDevPoolLink(data.poolLink);
			setStep("success");
		} catch {
			setError("Something went wrong. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleCreateNewPool = () => {
		if (typeof window !== "undefined") {
			localStorage.removeItem(CREATED_AT_KEY);
			localStorage.removeItem(DEV_POOL_LINK_KEY);
		}
		setCreatedAt(null);
		setDevPoolLink(null);
		setStep("hero");
	};

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
							We sent a link to your email for you to create your GameSquares
							pool.
						</p>
					</div>
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
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
				<div className="flex w-full max-w-md flex-col gap-8 text-center opacity-0 animate-fade-in-up">
					<div className="flex flex-col gap-2">
						<h2 className="font-mono text-xl text-balance font-bold text-foreground">
							You already created a GameSquares pool
						</h2>
						<p className="text-sm text-balance text-muted-foreground">
							Check your email for your admin link and the link to share with
							players.
						</p>
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
							placeholder="you@example.com"
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
							<span className="text-sm font-semibold text-card-foreground">
								100
							</span>
						</div>
						<div className="my-3 h-px bg-border" />
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Max players</span>
							<span className="text-sm font-semibold text-card-foreground">
								{totalPlayers}
							</span>
						</div>
					</div>

					{error && (
						<p className="text-sm text-destructive" role="alert">
							{error}
						</p>
					)}

					<button
						data-testid="landing-create-pool-submit"
						onClick={handleCreatePool}
						disabled={loading}
						className="w-full rounded-lg bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
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
				<div className="opacity-0 animate-fade-in-up animate-delay-3">
					<FooterLinks />
				</div>
			</div>
		</main>
	);
}
