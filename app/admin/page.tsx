"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

type QuarterState = Record<
	string,
	{ rowTeamScore: number; colTeamScore: number; complete: boolean }
>;

function defaultQuarters(): QuarterState {
	return Object.fromEntries(
		QUARTERS.map((q) => [
			q,
			{ rowTeamScore: 0, colTeamScore: 0, complete: false },
		]),
	) as QuarterState;
}

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

/** Validate all quarter scores are integers in 0–99 */
function validateScores(
	quarters: QuarterState,
): { valid: true } | { valid: false; error: string } {
	for (const q of QUARTERS) {
		const { rowTeamScore, colTeamScore } = quarters[q];
		for (const [label, value] of [
			["Row", rowTeamScore],
			["Col", colTeamScore],
		] as const) {
			if (!Number.isInteger(value) || value < 0 || value > 99) {
				return {
					valid: false,
					error: `${q} ${label} score must be an integer between 0 and 99 (got ${value}).`,
				};
			}
		}
	}
	return { valid: true };
}

// ── Types ────────────────────────────────────────────────────────────────

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

// ── Components ───────────────────────────────────────────────────────────

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

// ── Main Page ────────────────────────────────────────────────────────────

export default function AdminPage() {
	const gameData = useQuery(api.games.getCurrentGame, {});

	// Auth state
	const [secret, setSecret] = useState("");
	const [authenticated, setAuthenticated] = useState(false);
	const [authError, setAuthError] = useState("");
	const [authLoading, setAuthLoading] = useState(false);

	const poolsList = useQuery(
		api.pools.listPools,
		authenticated ? {} : "skip",
	);

	// Scores form state
	const [name, setName] = useState("Global Game");
	const [quarters, setQuarters] = useState<QuarterState>(defaultQuarters);
	const [scoresStatus, setScoresStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [scoresMessage, setScoresMessage] = useState("");
	const [showConfirm, setShowConfirm] = useState(false);

	// Diagnostic state
	const [diagLoading, setDiagLoading] = useState(false);
	const [diagResult, setDiagResult] = useState<DiagnosticResult | null>(null);
	const [diagError, setDiagError] = useState("");

	// Force fetch state
	const [fetchLoading, setFetchLoading] = useState(false);
	const [fetchResult, setFetchResult] = useState<FetchResult | null>(null);
	const [fetchError, setFetchError] = useState("");

	// Track whether we've synced form state from the current game at least once
	const hasSyncedRef = useRef(false);

	// When the current game loads for the first time, populate the form
	useEffect(() => {
		if (hasSyncedRef.current) return;
		if (!gameData) return;
		if (gameData.found) {
			const g = gameData.game;
			setName(g.name);
			const q: QuarterState = defaultQuarters();
			for (const gq of g.quarters) {
				if (gq.label in q) {
					q[gq.label] = {
						rowTeamScore: gq.rowTeamScore,
						colTeamScore: gq.colTeamScore,
						complete: gq.complete ?? false,
					};
				}
			}
			setQuarters(q);
		}
		hasSyncedRef.current = true;
	}, [gameData]);

	// ── Auth ─────────────────────────────────────────────────────────────

	async function handleAuth(e: React.FormEvent) {
		e.preventDefault();
		if (!secret.trim()) return;
		setAuthLoading(true);
		setAuthError("");
		try {
			const res = await fetch("/api/admin/status", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ secret: secret.trim() }),
			});
			if (res.status === 401) {
				setAuthError("Invalid passcode.");
				setAuthLoading(false);
				return;
			}
			const data = await res.json();
			if (!res.ok) {
				setAuthError(data.error ?? "Request failed");
				setAuthLoading(false);
				return;
			}
			setAuthenticated(true);
			setDiagResult(data);
		} catch (err) {
			setAuthError(err instanceof Error ? err.message : "Request failed");
		} finally {
			setAuthLoading(false);
		}
	}

	// ── Scores form ──────────────────────────────────────────────────────

	function hasChanges(): boolean {
		if (!gameData?.found) return true;
		const g = gameData.game;
		if (name.trim() !== g.name) return true;
		for (const q of QUARTERS) {
			const live = g.quarters.find((gq) => gq.label === q);
			const form = quarters[q];
			if (!live) {
				if (form.rowTeamScore !== 0 || form.colTeamScore !== 0 || form.complete)
					return true;
			} else {
				if (form.rowTeamScore !== live.rowTeamScore) return true;
				if (form.colTeamScore !== live.colTeamScore) return true;
				if (form.complete !== (live.complete ?? false)) return true;
			}
		}
		return false;
	}

	async function doSubmitScores() {
		setScoresStatus("loading");
		setScoresMessage("");
		try {
			const allQuarters = QUARTERS.map((label) => ({
				label,
				rowTeamScore: Number(quarters[label]?.rowTeamScore ?? 0),
				colTeamScore: Number(quarters[label]?.colTeamScore ?? 0),
				// Q4 (Final) is auto-complete when it has scores
				complete:
					label === "Q4"
						? (Number(quarters[label]?.rowTeamScore ?? 0) !== 0 ||
							Number(quarters[label]?.colTeamScore ?? 0) !== 0)
						: (quarters[label]?.complete ?? false),
			}));
			const filteredQuarters = allQuarters.filter((_, i, arr) => {
				for (let j = arr.length - 1; j >= 0; j--) {
					if (
						arr[j].rowTeamScore !== 0 ||
						arr[j].colTeamScore !== 0 ||
						arr[j].complete
					) {
						return i <= j;
					}
				}
				return i === 0;
			});

			// Game is complete when Final (Q4) has scores
			const q4 = quarters.Q4;
			const derivedGameComplete =
				(Number(q4?.rowTeamScore ?? 0) !== 0 ||
					Number(q4?.colTeamScore ?? 0) !== 0);

			const res = await fetch("/api/admin/scores", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					secret,
					name: name.trim() || "Global Game",
					quarters: filteredQuarters,
					gameComplete: derivedGameComplete,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				setScoresStatus("error");
				setScoresMessage(data.error ?? "Request failed");
				return;
			}
			setScoresStatus("success");
			setScoresMessage("Scores updated.");
		} catch (err) {
			setScoresStatus("error");
			setScoresMessage(err instanceof Error ? err.message : "Request failed");
		}
	}

	function handleSubmitScores(e: React.FormEvent) {
		e.preventDefault();
		const validation = validateScores(quarters);
		if (!validation.valid) {
			setScoresStatus("error");
			setScoresMessage(validation.error);
			return;
		}
		if (gameData?.found && hasChanges()) {
			setShowConfirm(true);
			return;
		}
		doSubmitScores();
	}

	function handleReset() {
		setQuarters(defaultQuarters());
		setName("Test Run");
		setScoresStatus("idle");
		setScoresMessage("");
	}

	// ── Diagnostic ───────────────────────────────────────────────────────

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

	// ── Force Update ─────────────────────────────────────────────────────

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

	// ── Render: Login gate ───────────────────────────────────────────────

	if (!authenticated) {
		return (
			<main className="min-h-dvh bg-background px-6 py-12">
				<div className="mx-auto max-w-md space-y-8 opacity-0 animate-fade-in-up">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold">Admin</h1>
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
						{authError && (
							<p className="text-sm text-destructive">{authError}</p>
						)}
						<button
							type="submit"
							disabled={authLoading}
							className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							{authLoading ? "Verifying\u2026" : "Sign In"}
						</button>
					</form>
				</div>
			</main>
		);
	}

	// ── Render: Authenticated dashboard ──────────────────────────────────

	return (
		<main className="min-h-dvh bg-background px-6 py-12">
			<div className="mx-auto max-w-2xl space-y-10 opacity-0 animate-fade-in-up">
				{/* Header */}
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Admin</h1>
					<Link
						href="/"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						&larr; Home
					</Link>
				</div>

				{/* ═══════════════════════════════════════════════════════════
				    SECTION 1: Current Game State
				    ═══════════════════════════════════════════════════════════ */}
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

				{/* ═══════════════════════════════════════════════════════════
				    SECTION: Pools (games people are running)
				    ═══════════════════════════════════════════════════════════ */}
				<section className="space-y-3">
					<h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
						Pools
					</h2>
					{poolsList === undefined && (
						<p className="text-sm text-muted-foreground">Loading...</p>
					)}
					{poolsList && poolsList.length === 0 && (
						<div className="rounded-md border border-border bg-muted/40 p-4">
							<p className="text-sm text-muted-foreground">
								No pools yet.
							</p>
						</div>
					)}
					{poolsList && poolsList.length > 0 && (
						<div className="rounded-md border border-border overflow-hidden">
							<div className="overflow-x-auto max-h-64 overflow-y-auto">
								<table className="w-full text-sm">
									<thead className="sticky top-0 bg-muted/80 border-b border-border">
										<tr>
											<th className="text-left py-2 px-3 font-semibold text-foreground">Title</th>
											<th className="text-left py-2 px-3 font-semibold text-foreground">Slug</th>
											<th className="text-left py-2 px-3 font-semibold text-foreground">Status</th>
											<th className="text-left py-2 px-3 font-semibold text-foreground">Created</th>
											<th className="text-right py-2 px-3 font-semibold text-foreground">Players</th>
											<th className="text-right py-2 px-3 font-semibold text-foreground">Claimed</th>
											<th className="text-left py-2 px-3 font-semibold text-foreground">Links</th>
										</tr>
									</thead>
									<tbody>
										{poolsList.map((pool) => (
											<tr key={pool._id} className="border-b border-border/50 hover:bg-muted/40">
												<td className="py-2 px-3 font-medium text-foreground truncate max-w-[180px]" title={pool.title}>
													{pool.title}
												</td>
												<td className="py-2 px-3 font-mono text-xs text-muted-foreground">
													{pool.slug}
												</td>
												<td className="py-2 px-3">
													<span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
														pool.status === "locked"
															? "bg-muted text-muted-foreground"
															: "bg-primary/15 text-primary"
													}`}>
														{pool.status}
													</span>
												</td>
												<td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
													{timeAgo(pool.createdAt)}
												</td>
												<td className="py-2 px-3 text-right tabular-nums">
													{pool.participantCount}
												</td>
												<td className="py-2 px-3 text-right tabular-nums">
													{pool.claimedCount}/100
												</td>
												<td className="py-2 px-3">
													<div className="flex items-center gap-2">
														<Link
															href={`/play/${pool.slug}`}
															target="_blank"
															rel="noopener noreferrer"
															className="text-primary hover:underline text-xs"
														>
															Play
														</Link>
														<Link
															href={`/view/${pool.slug}`}
															target="_blank"
															rel="noopener noreferrer"
															className="text-muted-foreground hover:text-foreground text-xs"
														>
															View
														</Link>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							{poolsList.length >= 100 && (
								<p className="text-xs text-muted-foreground px-3 py-2 border-t border-border">
									Showing most recent 100 pools.
								</p>
							)}
						</div>
					)}
				</section>

				{/* ═══════════════════════════════════════════════════════════
				    SECTION 2: Manual Scores
				    ═══════════════════════════════════════════════════════════ */}
				<section className="space-y-3">
					<h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
						Manual Scores
					</h2>
					<form onSubmit={handleSubmitScores} className="space-y-6">
						<div>
							<label
								htmlFor="game-name"
								className="mb-1 block text-sm font-medium text-foreground"
							>
								Game name
							</label>
							<input
								id="game-name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							/>
						</div>
						<div className="space-y-4">
							<span className="text-sm font-medium text-foreground">
								Quarters
							</span>
							<div className="grid gap-4 rounded-md border border-border p-4">
								{/* Column headers */}
								<div className="flex items-center gap-3">
									<span className="w-8 shrink-0" />
									<div className="flex flex-1 gap-2">
										<span className="flex-1 text-center text-[11px] font-bold uppercase tracking-wider text-blue-600 whitespace-nowrap">
											{diagResult?.homeTeam
												? `${diagResult.homeTeam.abbreviation} (Row)`
												: "Row (home)"}
										</span>
										<span className="flex-1 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 whitespace-nowrap">
											{diagResult?.awayTeam
												? `${diagResult.awayTeam.abbreviation} (Col)`
												: "Col (away)"}
										</span>
									</div>
									<span className="w-[60px] shrink-0" />
								</div>
								{QUARTERS.map((q) => (
									<div key={q} className="flex items-center gap-3">
										<span className={`w-8 shrink-0 text-sm ${q === "Q4" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
											{q === "Q4" ? "Final" : q}
										</span>
										<div className="flex flex-1 gap-2">
											<div className="flex-1">
												<label htmlFor={`${q}-row`} className="sr-only">
													{diagResult?.homeTeam
														? `${diagResult.homeTeam.abbreviation} score`
														: "Row team score"}
												</label>
												<input
													id={`${q}-row`}
													type="number"
													min={0}
													max={99}
													value={quarters[q]?.rowTeamScore ?? 0}
													onChange={(e) =>
														setQuarters((prev) => ({
															...prev,
															[q]: {
																...prev[q],
																rowTeamScore:
																	parseInt(e.target.value, 10) || 0,
															},
														}))
													}
													className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
												/>
											</div>
											<div className="flex-1">
												<label htmlFor={`${q}-col`} className="sr-only">
													{diagResult?.awayTeam
														? `${diagResult.awayTeam.abbreviation} score`
														: "Col team score"}
												</label>
												<input
													id={`${q}-col`}
													type="number"
													min={0}
													max={99}
													value={quarters[q]?.colTeamScore ?? 0}
													onChange={(e) =>
														setQuarters((prev) => ({
															...prev,
															[q]: {
																...prev[q],
																colTeamScore:
																	parseInt(e.target.value, 10) || 0,
															},
														}))
													}
													className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
												/>
											</div>
										</div>
										{q === "Q4" ? (
											<span className="w-[60px]" />
										) : (
											<label className="flex items-center gap-1.5 cursor-pointer">
												<input
													id={`${q}-complete`}
													type="checkbox"
													checked={quarters[q]?.complete ?? false}
													onChange={(e) =>
														setQuarters((prev) => ({
															...prev,
															[q]: {
																...prev[q],
																complete: e.target.checked,
															},
														}))
													}
													className="h-4 w-4 rounded border-border accent-primary"
												/>
												<span className="text-xs text-muted-foreground">
													Final
												</span>
											</label>
										)}
									</div>
								))}
							</div>
							<p className="text-xs text-muted-foreground">
								{diagResult?.homeTeam && diagResult?.awayTeam
									? `${diagResult.homeTeam.name} = Row (top numbers on grid), ${diagResult.awayTeam.name} = Col (side numbers).`
									: "Row = home team (top numbers on grid), Col = away team (side numbers)."}{" "}
								Scores must be 0&ndash;99 (cumulative). Check &quot;Final&quot;
								when Q1&ndash;Q3 are complete. The Final row is the end-of-game score.
							</p>
						</div>

						{/* Game complete is auto-derived: when Final (Q4) has scores, game is complete */}

						{scoresMessage && (
							<p
								className={
									scoresStatus === "error"
										? "text-sm text-destructive"
										: "text-sm text-muted-foreground"
								}
							>
								{scoresMessage}
							</p>
						)}

						<div className="flex gap-3">
							<button
								type="submit"
								disabled={scoresStatus === "loading"}
								className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
							>
								{scoresStatus === "loading"
									? "Saving\u2026"
									: "Save scores"}
							</button>
							<button
								type="button"
								onClick={handleReset}
								className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
							>
								Reset to zeros
							</button>
						</div>
					</form>
				</section>

				{/* ═══════════════════════════════════════════════════════════
				    SECTION 3: ESPN Feed Diagnostic
				    ═══════════════════════════════════════════════════════════ */}
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
							<p className="text-sm text-red-500">{diagResult.error}</p>
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

				{/* ═══════════════════════════════════════════════════════════
				    SECTION 4: Force Score Update
				    ═══════════════════════════════════════════════════════════ */}
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

			{/* ── Overwrite confirmation dialog ── */}
			{showConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="mx-4 w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-lg space-y-4">
						<h3 className="text-base font-semibold text-foreground">
							Update live game?
						</h3>
						<p className="text-sm text-muted-foreground">
							You&apos;re about to change the live game scores. All pools will
							see the new scores immediately.
						</p>
						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setShowConfirm(false)}
								className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => {
									setShowConfirm(false);
									doSubmitScores();
								}}
								className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
							>
								Continue
							</button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}
