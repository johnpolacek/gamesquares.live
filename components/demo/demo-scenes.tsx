"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import { PlusIcon, Copy, Share2, Users, Lock, Trophy } from "lucide-react";
import {
	DEMO_PLAYERS,
	DEMO_POOL_FULL,
	DEMO_POOL_EMPTY,
	DEMO_ROW_NUMBERS,
	DEMO_COL_NUMBERS,
	DEMO_QUARTERS,
	DEMO_WINNING_SQUARES,
	DEMO_Q1_WINNING,
	DEMO_Q1_SCORE,
	DEMO_FINAL_SCORE,
	getWinnerName,
	buildPartialGrid,
} from "./demo-data";
import type { Pool } from "@/lib/pool-store";

// ── Shared mini-grid component for scenes ───────────────────────────────

const QUARTER_COLORS: Record<string, { ring: string; bg: string; badge: string }> = {
	Q1: { ring: "oklch(0.60 0.20 145)", bg: "oklch(0.60 0.20 145 / 0.12)", badge: "oklch(0.45 0.15 145)" },
	Q2: { ring: "oklch(0.55 0.20 260)", bg: "oklch(0.55 0.20 260 / 0.12)", badge: "oklch(0.42 0.15 260)" },
	Q3: { ring: "oklch(0.60 0.22 25)", bg: "oklch(0.60 0.22 25 / 0.12)", badge: "oklch(0.48 0.18 25)" },
	Q4: { ring: "oklch(0.65 0.18 85)", bg: "oklch(0.65 0.18 85 / 0.15)", badge: "oklch(0.50 0.15 85)" },
};

type WinInfo = { label: string; quarter: string };

function MiniGrid({
	pool,
	winningSquares,
	currentScore,
	className = "",
}: {
	pool: Pool;
	winningSquares?: { quarterLabel: string; row: number; col: number }[];
	currentScore?: { rowDigit: number; colDigit: number } | null;
	className?: string;
}) {
	const winByKey = new Map<string, WinInfo>();
	if (winningSquares) {
		for (const w of winningSquares) {
			const ri = pool.rowNumbers.indexOf(w.row);
			const ci = pool.colNumbers.indexOf(w.col);
			if (ri >= 0 && ci >= 0) {
				const k = `${ri},${ci}`;
				const ex = winByKey.get(k);
				if (ex) winByKey.set(k, { label: `${ex.label} ${w.quarterLabel}`, quarter: ex.quarter });
				else winByKey.set(k, { label: w.quarterLabel, quarter: w.quarterLabel });
			}
		}
	}

	let csKey: string | null = null;
	if (currentScore) {
		const ri = pool.rowNumbers.indexOf(currentScore.rowDigit);
		const ci = pool.colNumbers.indexOf(currentScore.colDigit);
		if (ri >= 0 && ci >= 0) csKey = `${ri},${ci}`;
	}

	const showNumbers = pool.rowNumbers.some((n) => n !== null);

	return (
		<div className={`mini-grid ${className}`}>
			{/* Away team (Seahawks) label */}
			<div className="flex items-center justify-center pb-0.5 pl-4">
				<div className="flex items-center gap-1">
					<div className="h-1.5 w-1.5 rounded-full bg-away-team" />
					<span className="text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
						Seahawks
					</span>
				</div>
			</div>
			<div className="relative">
				{/* Home team (Patriots) label */}
				<div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-4">
					<div className="flex -rotate-90 items-center gap-1 whitespace-nowrap">
						<div className="h-1.5 w-1.5 rounded-full bg-home-team" />
						<span className="text-[7px] font-semibold uppercase tracking-wider text-muted-foreground">
							Patriots
						</span>
					</div>
				</div>
				<div
					className="grid ml-4"
					style={{
						gridTemplateColumns: "minmax(14px, 0.4fr) repeat(10, 1fr)",
						gridTemplateRows: "minmax(14px, 0.4fr) repeat(10, 1fr)",
					}}
				>
					<div />
					{/* Col headers */}
					{Array.from({ length: 10 }, (_, i) => (
						<div key={`ch-col-${pool.colNumbers[i] ?? i}`} className="flex items-center justify-center bg-away-team">
							<span className="text-[7px] font-bold text-away-team-foreground">
								{showNumbers ? (pool.colNumbers[i] ?? "") : ""}
							</span>
						</div>
					))}
					{/* Rows */}
					{pool.squares.map((row, ri) => (
						<React.Fragment key={`row-${pool.rowNumbers[ri] ?? ri}`}>
							<div className="flex items-center justify-center bg-home-team">
								<span className="text-[7px] font-bold text-home-team-foreground">
									{showNumbers ? (pool.rowNumbers[ri] ?? "") : ""}
								</span>
							</div>
							{row.map((sq) => {
								const k = `${sq.row},${sq.col}`;
								const wi = winByKey.get(k);
								const isCS = csKey === k;
								const qc = wi ? (QUARTER_COLORS[wi.quarter] ?? QUARTER_COLORS.Q1) : null;
								return (
									<div
										key={`${sq.row}-${sq.col}`}
										className={`grid-cell relative flex aspect-square items-center justify-center border-[0.3px] border-border/30 ${
											!wi && !isCS ? (sq.claimedBy ? "bg-white dark:bg-card" : "bg-card") : ""
										}`}
										style={
											wi && qc
												? { background: qc.bg, boxShadow: `inset 0 0 0 1.5px ${qc.ring}` }
												: isCS
													? { background: "oklch(0.92 0.12 90 / 0.3)", boxShadow: "inset 0 0 0 1.5px oklch(0.75 0.12 85)" }
													: undefined
										}
									>
										{wi && qc && (
											<span
												className="absolute right-0 top-0 px-px text-[4px] font-normal text-white leading-tight"
												style={{ background: qc.badge }}
											>
												{wi.label}
											</span>
										)}
										{sq.claimedBy && (
											<span className="text-[6px] leading-none">{sq.claimedBy.graphic}</span>
										)}
									</div>
								);
							})}
						</React.Fragment>
					))}
				</div>
			</div>
		</div>
	);
}

// ── Scene wrapper ───────────────────────────────────────────────────────
const SceneWrapper = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
	({ children, className = "" }, ref) => (
		<div
			ref={ref}
			className={`scene absolute inset-0 flex flex-col items-center justify-start overflow-y-auto px-4 pt-16 pb-32 sm:px-6 sm:justify-center sm:pt-16 sm:pb-36 ${className}`}
			style={{ willChange: "transform, opacity" }}
		>
			{children}
		</div>
	),
);
SceneWrapper.displayName = "SceneWrapper";

// ═══════════════════════════════════════════════════════════════════════
// Scene 1: Create Your Pool
// ═══════════════════════════════════════════════════════════════════════
export const SceneCreate = forwardRef<HTMLDivElement>((_, ref) => (
	<SceneWrapper ref={ref}>
		<div className="flex w-full max-w-md flex-col items-center gap-8">
			{/* Logo */}
			<div className="scene-el flex items-center gap-2">
				<svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-primary" aria-hidden="true">
					<rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.9" />
					<rect x="18" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
					<rect x="2" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
					<rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.3" />
				</svg>
				<h2 className="font-mono text-3xl font-bold tracking-tight text-foreground">GameSquares</h2>
			</div>

			{/* Title */}
			<h3 className="scene-el font-mono text-xl font-bold text-foreground text-center">
				Create Your Pool
			</h3>

			{/* Mock form */}
			<div className="scene-el w-full flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Pool title</span>
					<div className="w-full rounded-lg bg-card px-4 py-3 text-base text-foreground ring-1 ring-border">
						<span className="typing-text">Game Day Party 2026</span>
					</div>
				</div>
				<div className="flex flex-col gap-1.5">
					<span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Your email</span>
					<div className="w-full rounded-lg bg-card px-4 py-3 text-base text-muted-foreground ring-1 ring-border">
						you@example.com
					</div>
				</div>
			</div>

			{/* Squares per person */}
			<div className="scene-el w-full flex flex-col gap-2">
				<span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Squares per player</span>
				<div className="flex gap-2">
					{[1, 2, 4, 5, 10].map((n) => (
						<div
							key={n}
							className={`flex h-11 flex-1 items-center justify-center rounded-lg text-sm font-semibold ${
								n === 10
									? "bg-primary text-primary-foreground shadow-sm"
									: "bg-card text-card-foreground ring-1 ring-border"
							}`}
						>
							{n}
						</div>
					))}
				</div>
			</div>

			{/* CTA */}
			<div className="scene-el w-full">
				<div className="create-btn flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-sm">
					<PlusIcon className="w-5 h-5" /> Create Pool
				</div>
			</div>
		</div>
	</SceneWrapper>
));
SceneCreate.displayName = "SceneCreate";

// ═══════════════════════════════════════════════════════════════════════
// Scene 2: Share the Link
// ═══════════════════════════════════════════════════════════════════════
export const SceneShare = forwardRef<HTMLDivElement>((_, ref) => (
	<SceneWrapper ref={ref}>
		<div className="flex w-full max-w-md flex-col items-center gap-8">
			<div className="scene-el flex items-center gap-2 text-primary">
				<Share2 className="w-8 h-8" />
			</div>
			<h3 className="scene-el font-mono text-xl font-bold text-foreground text-center">
				Share the Link
			</h3>
			<p className="scene-el text-sm text-muted-foreground text-center text-balance">
				Send your unique link to friends and family so they can join your pool.
			</p>

			{/* URL mockup */}
			<div className="scene-el w-full flex flex-col gap-3">
				<span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
					Player link
				</span>
				<div className="flex items-center gap-2">
					<div className="flex-1 rounded-lg bg-card px-4 py-3 text-sm font-mono text-foreground ring-1 ring-border truncate">
						gamesquares.live/play/DEMO01
					</div>
					<div className="flex items-center justify-center rounded-lg bg-primary px-3 py-3 text-primary-foreground">
						<Copy className="w-4 h-4" />
					</div>
				</div>
			</div>

			{/* Chat mockup */}
			<div className="scene-el w-full flex flex-col gap-2.5">
				<div className="chat-bubble self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground max-w-[80%]">
					Hey! Join my football squares pool
				</div>
				<div className="chat-bubble self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground max-w-[80%] font-mono text-xs">
					gamesquares.live/play/DEMO01
				</div>
				<div className="chat-reply self-start rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-sm text-card-foreground ring-1 ring-border max-w-[80%]">
					Awesome, I&apos;m in! 🏈
				</div>
			</div>
		</div>
	</SceneWrapper>
));
SceneShare.displayName = "SceneShare";

// ═══════════════════════════════════════════════════════════════════════
// Scene 3: Players Join
// ═══════════════════════════════════════════════════════════════════════
export const SceneJoin = forwardRef<HTMLDivElement>((_, ref) => (
	<SceneWrapper ref={ref}>
		<div className="flex w-full max-w-md flex-col items-center gap-8">
			<div className="scene-el flex items-center gap-2 text-primary">
				<Users className="w-8 h-8" />
			</div>
			<h3 className="scene-el font-mono text-xl font-bold text-foreground text-center">
				Players Join
			</h3>
			<p className="scene-el text-sm text-muted-foreground text-center text-balance">
				Players pick a name and icon, then they&apos;re in!
			</p>

			{/* Mock join form */}
			<div className="scene-el w-full flex flex-col gap-3">
				<div className="rounded-lg bg-card p-4 ring-1 ring-border flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
						🏈
					</div>
					<div className="flex-1">
						<div className="text-sm font-semibold text-foreground">Mike M.</div>
						<div className="text-xs text-muted-foreground">Picking an icon...</div>
					</div>
					<div className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
						Join
					</div>
				</div>
			</div>

			{/* Player list appearing */}
			<div className="scene-el w-full">
				<span className="text-xs font-medium tracking-wide uppercase text-muted-foreground mb-2 block">
					Players ({DEMO_PLAYERS.length})
				</span>
				<div className="flex flex-wrap gap-2">
					{DEMO_PLAYERS.map((p) => (
						<div
							key={p.name}
							className="player-chip flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-card-foreground ring-1 ring-border"
						>
							<span>{p.graphic}</span>
							<span>{p.name}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	</SceneWrapper>
));
SceneJoin.displayName = "SceneJoin";

// ═══════════════════════════════════════════════════════════════════════
// Scene 4: Pick Your Squares
// ═══════════════════════════════════════════════════════════════════════
export const ScenePick = forwardRef<HTMLDivElement>((_, ref) => {
	const partialPool: Pool = {
		...DEMO_POOL_EMPTY,
		squares: buildPartialGrid(65),
		players: {},
	};
	return (
		<SceneWrapper ref={ref}>
			<div className="flex w-full max-w-lg sm:max-w-xl flex-col items-center gap-6">
				<h3 className="scene-el font-mono text-xl font-bold text-foreground text-center">
					Pick Your Squares
				</h3>
				<p className="scene-el text-sm text-muted-foreground text-center text-balance">
					Tap squares on the grid to claim them. Everyone gets their picks!
				</p>

				{/* Counter */}
				<div className="scene-el flex items-center gap-4">
					<div className="rounded-lg bg-card px-4 py-2 ring-1 ring-border text-center">
						<div className="pick-counter text-2xl font-bold font-mono text-foreground">65</div>
						<div className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100 claimed</div>
					</div>
				</div>

				{/* Grid */}
				<div className="scene-el w-full max-w-sm sm:max-w-md mx-auto">
					<MiniGrid pool={partialPool} />
				</div>
			</div>
		</SceneWrapper>
	);
});
ScenePick.displayName = "ScenePick";

// ═══════════════════════════════════════════════════════════════════════
// Scene 5: Game Time (assign numbers + lock)
// ═══════════════════════════════════════════════════════════════════════
export const SceneStart = forwardRef<HTMLDivElement>((_, ref) => (
	<SceneWrapper ref={ref}>
		<div className="flex w-full max-w-lg sm:max-w-xl flex-col items-center gap-6">
			<h3 className="scene-el font-mono text-xl font-bold text-foreground text-center">
				Game Time
			</h3>

			{/* Lock badge */}
			<div className="scene-el flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-primary">
				<Lock className="w-4 h-4" />
				<span className="text-sm font-semibold">Board Locked</span>
			</div>

			<p className="scene-el text-sm text-muted-foreground text-center text-balance">
				Numbers are randomly assigned to rows and columns. Let&apos;s go!
			</p>

			{/* Number reveal */}
			<div className="scene-el w-full max-w-sm sm:max-w-md mx-auto flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<div className="h-2.5 w-2.5 rounded-full bg-away-team" />
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seahawks</span>
					<div className="flex gap-1 ml-auto">
						{DEMO_COL_NUMBERS.map((n) => (
							<div key={`sea-${n}`} className="num-cell flex h-6 w-6 items-center justify-center rounded bg-away-team text-[10px] font-bold text-away-team-foreground">
								{n}
							</div>
						))}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<div className="h-2.5 w-2.5 rounded-full bg-home-team" />
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Patriots</span>
					<div className="flex gap-1 ml-auto">
						{DEMO_ROW_NUMBERS.map((n) => (
							<div key={`pat-${n}`} className="num-cell flex h-6 w-6 items-center justify-center rounded bg-home-team text-[10px] font-bold text-home-team-foreground">
								{n}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Full grid */}
			<div className="scene-el w-full max-w-sm sm:max-w-md mx-auto">
				<MiniGrid pool={DEMO_POOL_FULL} />
			</div>
		</div>
	</SceneWrapper>
));
SceneStart.displayName = "SceneStart";

// ═══════════════════════════════════════════════════════════════════════
// Scene 6: First Score!
// ═══════════════════════════════════════════════════════════════════════
export const SceneQ1 = forwardRef<HTMLDivElement>((_, ref) => {
	const q = DEMO_QUARTERS[0];
	const winner = getWinnerName(DEMO_POOL_FULL, q.homeScore, q.awayScore);
	return (
		<SceneWrapper ref={ref}>
			<div className="flex w-full max-w-lg sm:max-w-xl flex-col items-center gap-6">
				<h3 className="scene-el font-mono text-xl font-bold text-foreground text-center">
					First Score!
				</h3>

				{/* Scoreboard */}
				<div className="scene-el w-full max-w-sm">
					<div className="rounded-xl bg-card p-5 ring-1 ring-border">
						<div className="flex items-center justify-center gap-6">
							<div className="flex flex-col items-center gap-1">
								<div className="h-3 w-3 rounded-full bg-home-team" />
								<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patriots</span>
								<span className="score-num text-4xl font-bold font-mono text-foreground">{q.homeScore}</span>
							</div>
							<span className="text-2xl font-light text-muted-foreground">-</span>
							<div className="flex flex-col items-center gap-1">
								<div className="h-3 w-3 rounded-full bg-away-team" />
								<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seahawks</span>
								<span className="score-num text-4xl font-bold font-mono text-foreground">{q.awayScore}</span>
							</div>
						</div>
						<div className="mt-4 flex items-center justify-center gap-2">
							<span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
								style={{ background: QUARTER_COLORS.Q1.bg, color: QUARTER_COLORS.Q1.ring }}>
								Q1
							</span>
							<span className="winner-name text-sm font-semibold text-foreground">
								Winner: {winner}
							</span>
						</div>
					</div>
				</div>

				{/* Grid with Q1 highlight */}
				<div className="scene-el w-full max-w-sm sm:max-w-md mx-auto">
					<MiniGrid
						pool={DEMO_POOL_FULL}
						winningSquares={DEMO_Q1_WINNING}
						currentScore={DEMO_Q1_SCORE}
					/>
				</div>
			</div>
		</SceneWrapper>
	);
});
SceneQ1.displayName = "SceneQ1";

// ═══════════════════════════════════════════════════════════════════════
// Scene 7: The Final
// ═══════════════════════════════════════════════════════════════════════
export const SceneFinal = forwardRef<HTMLDivElement>((_, ref) => {
	const finalQ = DEMO_QUARTERS[3];
	return (
		<SceneWrapper ref={ref}>
			<div className="flex w-full max-w-lg sm:max-w-xl flex-col items-center gap-6">
				<div className="scene-el flex items-center gap-2 text-primary">
					<Trophy className="w-8 h-8" />
				</div>
				<h3 className="scene-el font-mono text-xl font-bold text-foreground text-center">
					The Final
				</h3>

				{/* Final scoreboard */}
				<div className="scene-el w-full max-w-sm">
					<div className="rounded-xl bg-card p-5 ring-1 ring-border">
						<div className="flex items-center justify-center gap-2 mb-3">
							<span className="rounded-full bg-green-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
								Final
							</span>
						</div>
						<div className="flex items-center justify-center gap-6">
							<div className="flex flex-col items-center gap-1">
								<div className="h-3 w-3 rounded-full bg-home-team" />
								<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patriots</span>
								<span className="score-num text-4xl font-bold font-mono text-foreground">{finalQ.homeScore}</span>
							</div>
							<span className="text-2xl font-light text-muted-foreground">-</span>
							<div className="flex flex-col items-center gap-1">
								<div className="h-3 w-3 rounded-full bg-away-team" />
								<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seahawks</span>
								<span className="score-num text-4xl font-bold font-mono text-foreground">{finalQ.awayScore}</span>
							</div>
						</div>

						{/* Quarter winners */}
						<div className="mt-4 flex flex-col gap-1.5">
							{DEMO_QUARTERS.map((q, i) => {
								const w = getWinnerName(DEMO_POOL_FULL, q.homeScore, q.awayScore);
								const qc = QUARTER_COLORS[q.label] ?? QUARTER_COLORS.Q1;
								return (
									<div key={q.label} className="quarter-row flex items-center justify-between text-sm">
										<div className="flex items-center gap-2">
											<span
												className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
												style={{ background: qc.badge }}
											>
												{i === 3 ? "FINAL" : q.label}
											</span>
											<span className="text-muted-foreground text-xs">
												{q.homeScore} - {q.awayScore}
											</span>
										</div>
										<span className="font-semibold text-foreground text-xs">{w}</span>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* Grid with all winners */}
				<div className="scene-el w-full max-w-sm sm:max-w-md mx-auto">
					<MiniGrid
						pool={DEMO_POOL_FULL}
						winningSquares={DEMO_WINNING_SQUARES}
						currentScore={DEMO_FINAL_SCORE}
					/>
				</div>

				{/* CTA */}
				<Link
					href="/"
					className="scene-el cta-btn flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
				>
					<PlusIcon className="w-5 h-5" /> Create Your Own Pool
				</Link>
			</div>
		</SceneWrapper>
	);
});
SceneFinal.displayName = "SceneFinal";
