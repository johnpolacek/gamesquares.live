"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Format a timestamp as a relative "X ago" string */
function timeAgo(ts: number): string {
	const diff = Date.now() - ts;
	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

type DiagnosticResult = {
	ok: boolean;
	error?: string;
	espnStatus: number;
	totalEvents?: number;
	superBowlFound?: boolean;
	eventName?: string | null;
	eventId?: string | null;
	gameState?: string | null;
	period?: number | null;
	gameCompleted?: boolean;
	homeTeam?: {
		name: string;
		abbreviation: string;
		score: string;
		id: string | null;
	} | null;
	awayTeam?: {
		name: string;
		abbreviation: string;
		score: string;
		id: string | null;
	} | null;
	quarters?: Array<{
		label: string;
		rowTeamScore: number;
		colTeamScore: number;
		complete?: boolean;
	}>;
	gameComplete?: boolean;
	possession?: string;
	downDistance?: string | null;
	isRedZone?: boolean;
	currentDbGame?: {
		name: string;
		updatedAt: number;
		quartersCount: number;
		gameComplete: boolean;
		possession: string;
		downDistance: string | null;
	} | null;
	wouldUpdate?: boolean;
	wouldUpdateReason?: string;
};

type FetchResult = {
	updated: boolean;
	quarters?: number;
	reason?: string;
};

function CheckIcon({ pass }: { pass: boolean }) {
	return (
		<span
			className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
				pass
					? "bg-emerald-500/15 text-emerald-600"
					: "bg-red-500/15 text-red-500"
			}`}
		>
			{pass ? "\u2713" : "\u2717"}
		</span>
	);
}

export default function AdminStatusPage() {
	const gameData = useQuery(api.games.getCurrentGame, {});

	const [secret, setSecret] = useState("");
	const [authenticated, setAuthenticated] = useState(false);

	// Diagnostic state
	const [diagLoading, setDiagLoading] = useState(false);
	const [diagResult, setDiagResult] = useState<DiagnosticResult | null>(null);
	const [diagError, setDiagError] = useState("");

	// Force fetch state
	const [fetchLoading, setFetchLoading] = useState(false);
	const [fetchResult, setFetchResult] = useState<FetchResult | null>(null);
	const [fetchError, setFetchError] = useState("");

	async function handleAuth(e: React.FormEvent) {
		e.preventDefault();
		if (!secret.trim()) return;
		// Test the secret by running a diagnostic
		setDiagLoading(true);
		setDiagError("");
		setDiagResult(null);
		try {
			const res = await fetch("/api/admin/status", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ secret: secret.trim() }),
			});
			if (res.status === 401) {
				setDiagError("Invalid passcode.");
				setDiagLoading(false);
				return;
			}
			const data = await res.json();
			if (!res.ok) {
				setDiagError(data.error ?? "Request failed");
				setDiagLoading(false);
				return;
			}
			setAuthenticated(true);
			setDiagResult(data);
		} catch (err) {
			setDiagError(err instanceof Error ? err.message : "Request failed");
		} finally {
			setDiagLoading(false);
		}
	}

	async function runDiagnostic() {
		setDiagLoading(true);
		setDiagError("");
		setDiagResult(null);
		try {
			const res = await fetch("/api/admin/status", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ secret: secret.trim() }),
			});
			const data = await res.json();
			if (!res.ok) {
				setDiagError(data.error ?? "Request failed");
				return;
			}
			setDiagResult(data);
		} catch (err) {
			setDiagError(err instanceof Error ? err.message : "Request failed");
		} finally {
			setDiagLoading(false);
		}
	}

	async function forceUpdate() {
		setFetchLoading(true);
		setFetchError("");
		setFetchResult(null);
		try {
			const res = await fetch("/api/admin/fetch-scores", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ secret: secret.trim() }),
			});
			const data = await res.json();
			if (!res.ok) {
				setFetchError(data.error ?? "Request failed");
				return;
			}
			setFetchResult(data);
		} catch (err) {
			setFetchError(err instanceof Error ? err.message : "Request failed");
		} finally {
			setFetchLoading(false);
		}
	}

	// Not authenticated yet -- show passcode form
	if (!authenticated) {
		return (
			<main className="min-h-dvh bg-background px-6 py-12">
				<div className="mx-auto max-w-md space-y-8 opacity-0 animate-fade-in-up">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold">System Status</h1>
						<Link
							href="/"
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							&larr; Home
						</Link>
					</div>
					<form onSubmit={handleAuth} className="space-y-4">
						<div>
							<label
								htmlFor="passcode"
								className="mb-1 block text-sm font-medium text-foreground"
							>
								Admin Passcode
							</label>
							<input
								id="passcode"
								type="password"
								placeholder="Enter admin secret"
								value={secret}
								onChange={(e) => setSecret(e.target.value)}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								required
								autoComplete="off"
							/>
						</div>
						{diagError && (
							<p className="text-sm text-destructive">{diagError}</p>
						)}
						<button
							type="submit"
							disabled={diagLoading}
							className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							{diagLoading ? "Verifying\u2026" : "Authenticate & Run Diagnostic"}
						</button>
					</form>
				</div>
			</main>
		);
	}

	// Authenticated -- show full status page
	return (
		<main className="min-h-dvh bg-background px-6 py-12">
			<div className="mx-auto max-w-2xl space-y-8 opacity-0 animate-fade-in-up">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">System Status</h1>
					<div className="flex items-center gap-4">
						<Link
							href="/admin/scores"
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							Scores
						</Link>
						<Link
							href="/"
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							&larr; Home
						</Link>
					</div>
				</div>

				{/* ── Current Game State ── */}
				<section className="space-y-3">
					<h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
						Current Game in Database
					</h2>
					{!gameData && (
						<p className="text-sm text-muted-foreground">Loading...</p>
					)}
					{gameData && !gameData.found && (
						<div className="rounded-md border border-border bg-muted/40 p-4">
							<p className="text-sm text-muted-foreground">
								No game data in the database yet.
							</p>
						</div>
					)}
					{gameData?.found && (
						<div className="rounded-md border border-border bg-muted/40 p-4 space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-sm font-semibold text-foreground">
									{gameData.game.name}
								</span>
								<span className="text-xs text-muted-foreground">
									Updated {timeAgo(gameData.game.updatedAt)}
								</span>
							</div>
							<div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
								{gameData.game.quarters.map((q) => (
									<span key={q.label}>
										<span className="font-medium text-foreground">
											{q.label}
										</span>{" "}
										{q.rowTeamScore}&ndash;{q.colTeamScore}
										{q.complete && (
											<span className="ml-0.5 text-primary font-semibold">
												F
											</span>
										)}
									</span>
								))}
							</div>
							<div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
								{gameData.game.gameComplete && (
									<span className="rounded bg-primary/15 px-1.5 py-0.5 font-semibold text-primary">
										Game Complete
									</span>
								)}
								{gameData.game.possession &&
									gameData.game.possession !== "none" && (
										<span>
											Possession:{" "}
											<span className="font-medium text-foreground">
												{gameData.game.possession}
											</span>
										</span>
									)}
								{gameData.game.downDistance && (
									<span>
										Down:{" "}
										<span className="font-medium text-foreground">
											{gameData.game.downDistance}
										</span>
									</span>
								)}
								<span>
									Source:{" "}
									<span className="font-medium text-foreground">
										{gameData.game.source}
									</span>
								</span>
							</div>
						</div>
					)}
				</section>

				{/* ── ESPN Feed Diagnostic ── */}
				<section className="space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
							ESPN Feed Diagnostic
						</h2>
						<button
							type="button"
							onClick={runDiagnostic}
							disabled={diagLoading}
							className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							{diagLoading ? "Testing\u2026" : "Test ESPN Feed"}
						</button>
					</div>

					{diagError && (
						<div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
							<p className="text-sm text-red-600">{diagError}</p>
						</div>
					)}

					{diagResult && !diagResult.ok && (
						<div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 space-y-1">
							<p className="text-sm font-semibold text-red-600">
								ESPN Feed Error
							</p>
							<p className="text-sm text-red-500">
								{diagResult.error}
							</p>
							<p className="text-xs text-muted-foreground">
								HTTP Status: {diagResult.espnStatus}
							</p>
						</div>
					)}

					{diagResult?.ok && (
						<div className="rounded-md border border-border bg-white p-4 space-y-4">
							{/* Checklist */}
							<div className="grid gap-2">
								<div className="flex items-center gap-2 text-sm">
									<CheckIcon pass={diagResult.espnStatus === 200} />
									<span>
										ESPN API reachable{" "}
										<span className="text-muted-foreground">
											(HTTP {diagResult.espnStatus})
										</span>
									</span>
								</div>
								<div className="flex items-center gap-2 text-sm">
									<CheckIcon
										pass={diagResult.superBowlFound === true}
									/>
									<span>
										Super Bowl event found{" "}
										<span className="text-muted-foreground">
											({diagResult.totalEvents} total events)
										</span>
									</span>
								</div>
								<div className="flex items-center gap-2 text-sm">
									<CheckIcon
										pass={
											diagResult.homeTeam != null &&
											diagResult.awayTeam != null
										}
									/>
									<span>Teams detected</span>
								</div>
								<div className="flex items-center gap-2 text-sm">
									<CheckIcon
										pass={diagResult.gameState === "in"}
									/>
									<span>
										Game state:{" "}
										<span className="font-semibold text-foreground">
											{diagResult.gameState ?? "unknown"}
										</span>
										{diagResult.period != null && (
											<span className="text-muted-foreground">
												{" "}
												(period {diagResult.period})
											</span>
										)}
									</span>
								</div>
								<div className="flex items-center gap-2 text-sm">
									<CheckIcon
										pass={(diagResult.quarters?.length ?? 0) > 0}
									/>
									<span>
										Scores parsed{" "}
										<span className="text-muted-foreground">
											({diagResult.quarters?.length ?? 0} quarters)
										</span>
									</span>
								</div>
								<div className="flex items-center gap-2 text-sm">
									<CheckIcon
										pass={
											diagResult.possession === "home" ||
											diagResult.possession === "away"
										}
									/>
									<span>
										Possession data{" "}
										<span className="text-muted-foreground">
											({diagResult.possession ?? "none"})
										</span>
									</span>
								</div>
							</div>

							{/* Event details */}
							{diagResult.eventName && (
								<div className="border-t border-border pt-3 space-y-2">
									<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
										Event Details
									</h3>
									<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
										<span className="text-muted-foreground">Event</span>
										<span className="font-medium truncate">
											{diagResult.eventName}
										</span>
										<span className="text-muted-foreground">ESPN ID</span>
										<span className="font-mono text-xs">
											{diagResult.eventId}
										</span>
									</div>
								</div>
							)}

							{/* Teams */}
							{(diagResult.homeTeam || diagResult.awayTeam) && (
								<div className="border-t border-border pt-3 space-y-2">
									<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
										Teams
									</h3>
									<div className="grid grid-cols-2 gap-3">
										{diagResult.homeTeam && (
											<div className="rounded-md bg-blue-500/8 p-2.5 ring-1 ring-blue-500/20">
												<div className="text-xs font-bold uppercase tracking-wider text-blue-600">
													Home (Row)
												</div>
												<div className="mt-1 text-sm font-semibold">
													{diagResult.homeTeam.name}
												</div>
												<div className="text-xs text-muted-foreground">
													{diagResult.homeTeam.abbreviation} &middot; Score:{" "}
													{diagResult.homeTeam.score} &middot; ID:{" "}
													{diagResult.homeTeam.id ?? "?"}
												</div>
											</div>
										)}
										{diagResult.awayTeam && (
											<div className="rounded-md bg-emerald-500/8 p-2.5 ring-1 ring-emerald-500/20">
												<div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
													Away (Col)
												</div>
												<div className="mt-1 text-sm font-semibold">
													{diagResult.awayTeam.name}
												</div>
												<div className="text-xs text-muted-foreground">
													{diagResult.awayTeam.abbreviation} &middot; Score:{" "}
													{diagResult.awayTeam.score} &middot; ID:{" "}
													{diagResult.awayTeam.id ?? "?"}
												</div>
											</div>
										)}
									</div>
								</div>
							)}

							{/* Parsed quarters */}
							{diagResult.quarters && diagResult.quarters.length > 0 && (
								<div className="border-t border-border pt-3 space-y-2">
									<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
										Parsed Quarter Scores (Cumulative)
									</h3>
									<div className="flex flex-wrap gap-3 text-sm">
										{diagResult.quarters.map((q) => (
											<span
												key={q.label}
												className="rounded bg-muted px-2 py-1 font-mono text-xs"
											>
												{q.label}: {q.rowTeamScore}&ndash;{q.colTeamScore}
												{q.complete && " (F)"}
											</span>
										))}
									</div>
								</div>
							)}

							{/* Possession */}
							{diagResult.downDistance && (
								<div className="border-t border-border pt-3 space-y-1">
									<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
										Possession
									</h3>
									<p className="text-sm">
										<span className="font-medium">
											{diagResult.possession === "home"
												? diagResult.homeTeam?.abbreviation ?? "Home"
												: diagResult.possession === "away"
													? diagResult.awayTeam?.abbreviation ?? "Away"
													: "None"}
										</span>
										{" \u2014 "}
										<span className="text-muted-foreground">
											{diagResult.downDistance}
										</span>
										{diagResult.isRedZone && (
											<span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
												Red Zone
											</span>
										)}
									</p>
								</div>
							)}

							{/* Would update? */}
							<div className="border-t border-border pt-3 space-y-1">
								<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
									Cron Dedup Analysis
								</h3>
								<div className="flex items-center gap-2 text-sm">
									<CheckIcon pass={diagResult.wouldUpdate === true} />
									<span>
										{diagResult.wouldUpdate
											? "Would write a new row"
											: "Would skip (no update needed)"}
									</span>
								</div>
								<p className="text-xs text-muted-foreground">
									{diagResult.wouldUpdateReason}
								</p>
							</div>
						</div>
					)}
				</section>

				{/* ── Force Update ── */}
				<section className="space-y-3">
					<h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
						Force Score Update
					</h2>
					<p className="text-xs text-muted-foreground">
						Manually trigger the same action the cron runs every minute.
						This will write to the database if ESPN data differs from the
						current game state.
					</p>
					<button
						type="button"
						onClick={forceUpdate}
						disabled={fetchLoading}
						className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
					>
						{fetchLoading
							? "Fetching\u2026"
							: "Run fetchAndUpdateScores"}
					</button>

					{fetchError && (
						<div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
							<p className="text-sm text-red-600">{fetchError}</p>
						</div>
					)}

					{fetchResult && (
						<div
							className={`rounded-md border p-3 ${
								fetchResult.updated
									? "border-emerald-500/30 bg-emerald-500/10"
									: "border-border bg-muted/40"
							}`}
						>
							{fetchResult.updated ? (
								<p className="text-sm font-medium text-emerald-600">
									Scores updated ({fetchResult.quarters} quarters written)
								</p>
							) : (
								<p className="text-sm text-muted-foreground">
									No update:{" "}
									<span className="font-medium text-foreground">
										{fetchResult.reason}
									</span>
								</p>
							)}
						</div>
					)}
				</section>
			</div>
		</main>
	);
}
