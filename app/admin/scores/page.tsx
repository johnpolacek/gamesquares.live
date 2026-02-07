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

export default function GlobalScoresAdminPage() {
	const gameData = useQuery(api.games.getCurrentGame, {});

	const [secret, setSecret] = useState("");
	const [name, setName] = useState("Global Game");
	const [quarters, setQuarters] = useState<QuarterState>(defaultQuarters);
	const [gameComplete, setGameComplete] = useState(false);
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const [message, setMessage] = useState("");
	const [showConfirm, setShowConfirm] = useState(false);

	// Track whether we've synced form state from the current game at least once
	const hasSyncedRef = useRef(false);

	// When the current game loads for the first time, populate the form
	useEffect(() => {
		if (hasSyncedRef.current) return;
		if (!gameData) return; // query still loading
		if (gameData.found) {
			const g = gameData.game;
			setName(g.name);
			setGameComplete(g.gameComplete ?? false);
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

	/** Check whether form values differ from the current live game */
	function hasChanges(): boolean {
		if (!gameData?.found) return true; // no live game — always allow
		const g = gameData.game;
		if (name.trim() !== g.name) return true;
		if (gameComplete !== (g.gameComplete ?? false)) return true;
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

	async function doSubmit() {
		setStatus("loading");
		setMessage("");
		try {
			const allQuarters = QUARTERS.map((label) => ({
				label,
				rowTeamScore: Number(quarters[label]?.rowTeamScore ?? 0),
				colTeamScore: Number(quarters[label]?.colTeamScore ?? 0),
				complete: quarters[label]?.complete ?? false,
			}));

			// Only include quarters up to the last one with a non-zero score or marked complete.
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
				// All zeros and none complete: include just Q1
				return i === 0;
			});

			const res = await fetch("/api/admin/scores", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					secret,
					name: name.trim() || "Global Game",
					quarters: filteredQuarters,
					gameComplete,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				setStatus("error");
				setMessage(data.error ?? "Request failed");
				return;
			}
			setStatus("success");
			setMessage("Scores updated.");
		} catch (err) {
			setStatus("error");
			setMessage(err instanceof Error ? err.message : "Request failed");
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		// Client-side validation
		const validation = validateScores(quarters);
		if (!validation.valid) {
			setStatus("error");
			setMessage(validation.error);
			return;
		}

		// Overwrite confirmation when a live game exists and form has changes
		if (gameData?.found && hasChanges()) {
			setShowConfirm(true);
			return;
		}

		doSubmit();
	}

	function handleReset() {
		setQuarters(defaultQuarters());
		setGameComplete(false);
		setName("Test Run");
		setStatus("idle");
		setMessage("");
	}

	return (
		<main className="min-h-dvh bg-background px-6 py-12">
			<div className="mx-auto max-w-md space-y-8">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Global Game Scores</h1>
					<Link
						href="/"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						&larr; Home
					</Link>
				</div>

				{/* ── Current game summary ── */}
				{gameData?.found && (
					<div className="rounded-md border border-border bg-muted/40 p-4 space-y-2">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold text-foreground">
								Live Game
							</h2>
							<span className="text-xs text-muted-foreground">
								Updated {timeAgo(gameData.game.updatedAt)}
							</span>
						</div>
						<p className="text-sm text-foreground font-medium">
							{gameData.game.name}
							{gameData.game.gameComplete && (
								<span className="ml-2 inline-block rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
									Final
								</span>
							)}
						</p>
						<div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
							{gameData.game.quarters.map((q) => (
								<span key={q.label}>
									<span className="font-medium text-foreground">{q.label}</span>{" "}
									{q.rowTeamScore}&ndash;{q.colTeamScore}
									{q.complete && (
										<span className="ml-0.5 text-primary font-semibold">
											F
										</span>
									)}
								</span>
							))}
						</div>
					</div>
				)}

				{!gameData && (
					<p className="text-sm text-muted-foreground">Loading game data...</p>
				)}
				{gameData && !gameData.found && (
					<p className="text-sm text-muted-foreground">
						No game has been set yet. Fill in the form below to create one.
					</p>
				)}

				{/* ── Form ── */}
				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label
							htmlFor="name"
							className="mb-1 block text-sm font-medium text-foreground"
						>
							Game name
						</label>
						<input
							id="name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						/>
					</div>
					<div>
						<label
							htmlFor="passcode"
							className="mb-1 block text-sm font-medium text-foreground"
						>
							Passcode
						</label>
						<input
							id="passcode"
							type="password"
							placeholder="e.g. 12345"
							value={secret}
							onChange={(e) => setSecret(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							required
							autoComplete="off"
						/>
					</div>
					<div className="space-y-4">
						<span className="text-sm font-medium text-foreground">
							Quarters
						</span>
						<div className="grid gap-4 rounded-md border border-border p-4">
							{QUARTERS.map((q) => (
								<div key={q} className="flex items-center gap-3">
									<span className="w-8 text-sm text-muted-foreground">{q}</span>
									<div className="flex gap-2">
										<div>
											<label htmlFor={`${q}-row`} className="sr-only">
												Row team score
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
										<div>
											<label htmlFor={`${q}-col`} className="sr-only">
												Col team score
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
										<span className="text-xs text-muted-foreground">Final</span>
									</label>
								</div>
							))}
						</div>
						<p className="text-xs text-muted-foreground">
							Row = first team (e.g. row numbers), Col = second team (e.g.
							column numbers). Scores must be 0&ndash;99. Check &quot;Final&quot;
							when a quarter is complete.
						</p>
					</div>

					{/* Game complete toggle */}
					<label className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer">
						<input
							id="game-complete"
							type="checkbox"
							checked={gameComplete}
							onChange={(e) => setGameComplete(e.target.checked)}
							className="h-4 w-4 rounded border-border accent-primary"
						/>
						<div>
							<span className="text-sm font-medium text-foreground">
								Game Complete
							</span>
							<p className="text-xs text-muted-foreground">
								Mark the entire game as final.
							</p>
						</div>
					</label>

					{message && (
						<p
							className={
								status === "error"
									? "text-sm text-destructive"
									: "text-sm text-muted-foreground"
							}
						>
							{message}
						</p>
					)}

					<div className="flex gap-3">
						<button
							type="submit"
							disabled={status === "loading"}
							className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							{status === "loading" ? "Saving\u2026" : "Save scores"}
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
									doSubmit();
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
