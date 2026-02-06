"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { SquaresGrid } from "@/components/squares-grid";
import { GraphicIcon } from "@/components/graphic-icon";
import { api } from "@/convex/_generated/api";
import { transformToPool } from "@/lib/convex-to-pool";

type Quarter = {
	label: string;
	rowTeamScore: number;
	colTeamScore: number;
	complete?: boolean;
};

/**
 * Given a score digit pair and the pool's number assignments,
 * return the player name who owns that square (or null).
 */
function findSquareOwner(
	rowDigit: number,
	colDigit: number,
	pool: { rowNumbers: (number | null)[]; colNumbers: (number | null)[]; squares: { claimedBy: { name: string } | null }[][] },
): string | null {
	const rowIdx = pool.rowNumbers.indexOf(rowDigit);
	const colIdx = pool.colNumbers.indexOf(colDigit);
	if (rowIdx >= 0 && colIdx >= 0) {
		return pool.squares[rowIdx]?.[colIdx]?.claimedBy?.name ?? null;
	}
	return null;
}

type WhatIfScenario = {
	label: string;
	teamSide: "row" | "col";
	points: number;
	newRowScore: number;
	newColScore: number;
	rowDigit: number;
	colDigit: number;
	playerName: string | null;
};

function computeWhatIfs(
	currentRowScore: number,
	currentColScore: number,
	pool: { rowNumbers: (number | null)[]; colNumbers: (number | null)[]; squares: { claimedBy: { name: string } | null }[][] },
): WhatIfScenario[] {
	const scenarios: { label: string; teamSide: "row" | "col"; points: number }[] = [
		{ label: "Eagles FG", teamSide: "row", points: 3 },
		{ label: "Eagles TD", teamSide: "row", points: 7 },
		{ label: "Patriots FG", teamSide: "col", points: 3 },
		{ label: "Patriots TD", teamSide: "col", points: 7 },
	];

	return scenarios.map((s) => {
		const newRowScore = s.teamSide === "row" ? currentRowScore + s.points : currentRowScore;
		const newColScore = s.teamSide === "col" ? currentColScore + s.points : currentColScore;
		const rowDigit = newRowScore % 10;
		const colDigit = newColScore % 10;
		const playerName = findSquareOwner(rowDigit, colDigit, pool);
		return { ...s, newRowScore, newColScore, rowDigit, colDigit, playerName };
	});
}

export default function ViewPage() {
	const params = useParams<{ slug: string }>();
	const slug = params.slug;

	const poolData = useQuery(api.pools.getPoolBySlug, { slug });
	const gameData = useQuery(api.games.getCurrentGame, {});

	// Loading
	if (poolData === undefined) {
		return (
			<main
				className="flex h-dvh items-center justify-center bg-[oklch(0.13_0.02_250)]"
				data-testid="view-loading"
			>
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400" />
			</main>
		);
	}

	// Not found
	if (!poolData.found) {
		return (
			<main className="flex h-dvh flex-col items-center justify-center bg-[oklch(0.13_0.02_250)]">
				<h1
					data-testid="view-not-found"
					className="text-2xl font-bold text-white"
				>
					Pool Not Found
				</h1>
				<p className="mt-2 text-white/60">
					This pool doesn&apos;t exist or may have been removed.
				</p>
			</main>
		);
	}

	const pool = transformToPool(
		poolData.pool,
		poolData.squares,
		poolData.participants,
	);

	const numbersAssigned = pool.rowNumbers.some((n) => n !== null);
	const hasGame = gameData?.found === true;
	const game = hasGame ? gameData.game : null;
	const quarters: Quarter[] = game?.quarters ?? [];
	const latestQuarter = quarters.length > 0 ? quarters[quarters.length - 1] : null;
	const isGameComplete = game?.gameComplete === true;

	// Current scores
	const currentRowScore = latestQuarter?.rowTeamScore ?? 0;
	const currentColScore = latestQuarter?.colTeamScore ?? 0;

	// Winning squares for the grid
	const winningSquares = hasGame
		? quarters.map((q) => ({
				quarterLabel: q.label,
				row: q.rowTeamScore % 10,
				col: q.colTeamScore % 10,
			}))
		: [];

	// Current score highlight
	const currentScore = numbersAssigned
		? latestQuarter
			? {
					rowDigit: latestQuarter.rowTeamScore % 10,
					colDigit: latestQuarter.colTeamScore % 10,
				}
			: { rowDigit: 0, colDigit: 0 }
		: null;

	// Quarter displays with winners
	const quarterDisplays = numbersAssigned
		? quarters.map((q, idx) => {
				const playerName = findSquareOwner(
					q.rowTeamScore % 10,
					q.colTeamScore % 10,
					pool,
				);
				const isLatest = idx === quarters.length - 1;
				return {
					label: q.label,
					rowTeamScore: q.rowTeamScore,
					colTeamScore: q.colTeamScore,
					playerName,
					isLatest,
					isComplete: q.complete === true,
				};
			})
		: [];

	// What-if scenarios
	const whatIfs =
		numbersAssigned && !isGameComplete
			? computeWhatIfs(currentRowScore, currentColScore, pool)
			: [];

	return (
		<div
			className="flex h-dvh flex-col overflow-hidden bg-[oklch(0.13_0.02_250)] text-white"
			data-testid="view-scoreboard"
		>
			{/* Header */}
			<header className="flex shrink-0 items-center justify-between px-6 py-3 bg-[oklch(0.10_0.02_250)] border-b border-white/10">
				<div className="flex items-center gap-3">
					<svg
						width="28"
						height="28"
						viewBox="0 0 32 32"
						fill="none"
						className="text-emerald-400"
						aria-hidden="true"
					>
						<rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.9" />
						<rect x="18" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
						<rect x="2" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.6" />
						<rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" opacity="0.3" />
					</svg>
					<span className="text-lg font-bold text-white/70 tracking-wide">
						GameSquares<span className="text-emerald-400">.live</span>
					</span>
				</div>
				<div className="flex items-center gap-4">
					{game && (
						<span className="text-sm font-semibold text-white/80">
							{game.name}
						</span>
					)}
					{isGameComplete && (
						<span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
							Final
						</span>
					)}
					{!isGameComplete && hasGame && (
						<span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-400 animate-pulse">
							Live
						</span>
					)}
				</div>
			</header>

			{/* Main content */}
			<div className="flex flex-1 min-h-0">
				{/* Left side: Grid */}
				<div className="flex flex-1 flex-col items-center justify-center p-4 min-w-0">
					{/* Score bar above grid */}
					{hasGame && (
						<div className="mb-4 flex items-center gap-6" data-testid="view-score-bar">
							<div className="flex flex-col items-center">
								<span className="text-xs font-bold uppercase tracking-wider text-emerald-400/80">
									Eagles
								</span>
								<span className="text-5xl font-black tabular-nums text-white" data-testid="view-eagles-score">
									{currentRowScore}
								</span>
							</div>
							<div className="flex flex-col items-center">
								<span className="text-lg font-bold text-white/30">vs</span>
								{latestQuarter && !isGameComplete && (
									<span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
										{latestQuarter.label}
									</span>
								)}
								{isGameComplete && (
									<span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
										Final
									</span>
								)}
							</div>
							<div className="flex flex-col items-center">
								<span className="text-xs font-bold uppercase tracking-wider text-blue-400/80">
									Patriots
								</span>
								<span className="text-5xl font-black tabular-nums text-white" data-testid="view-patriots-score">
									{currentColScore}
								</span>
							</div>
						</div>
					)}

					<div className="view-grid-dark w-full max-w-[min(60vh,600px)] [&_.text-muted-foreground]:text-white/50 [&_.bg-card]:bg-white/5 [&_.text-foreground]:text-white [&_.bg-white]:bg-white/10 [&_.ring-border]:ring-white/10">
						<SquaresGrid
							pool={pool}
							interactive={false}
							winningSquares={winningSquares}
							currentScore={currentScore}
						/>
					</div>
				</div>

				{/* Right side: Scoreboard info */}
				<div className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-white/10 bg-[oklch(0.11_0.02_250)] p-5">
					{/* Quarter scores */}
					{quarterDisplays.length > 0 && (
						<div data-testid="view-quarter-scores">
							<h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">
								Scoring
							</h3>
							<div className="flex flex-col gap-2">
								{quarterDisplays.map((q) => {
									const isFinal = isGameComplete && q.isLatest;
									const eaglesWinning = q.rowTeamScore > q.colTeamScore;
									const patriotsWinning = q.colTeamScore > q.rowTeamScore;
									return (
										<div
											key={q.label}
											className={`rounded-lg p-3 ${
												q.isLatest && !isGameComplete
													? "bg-emerald-500/10 ring-1 ring-emerald-500/30"
													: "bg-white/5"
											}`}
										>
											<div className="flex items-center justify-between">
												<span className="text-xs font-bold text-white/60 uppercase tracking-wide">
													{isFinal ? "FINAL" : q.label}
												</span>
												{q.playerName && (
													<span
														className={`text-[10px] font-bold uppercase tracking-wider ${
															q.isComplete || isGameComplete
																? "text-emerald-400"
																: "text-yellow-400"
														}`}
													>
														{q.isComplete || isGameComplete
															? "Winner"
															: "Winning"}
													</span>
												)}
											</div>
											<div className="mt-1 flex items-baseline gap-2">
												<span
													className={`text-lg font-bold tabular-nums ${
														eaglesWinning ? "text-emerald-400" : "text-white"
													}`}
												>
													{q.rowTeamScore}
												</span>
												<span className="text-white/30">-</span>
												<span
													className={`text-lg font-bold tabular-nums ${
														patriotsWinning ? "text-blue-400" : "text-white"
													}`}
												>
													{q.colTeamScore}
												</span>
												{q.playerName && (
													<span className="ml-auto text-sm font-bold text-white truncate max-w-[120px]">
														{q.playerName}
													</span>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* What-If Scenarios */}
					{whatIfs.length > 0 && (
						<div data-testid="view-what-if">
							<h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">
								Next Score Wins
							</h3>
							<div className="grid grid-cols-2 gap-2">
								{whatIfs.map((s) => (
									<div
										key={s.label}
										className={`rounded-lg p-3 ${
											s.teamSide === "row"
												? "bg-emerald-500/8 ring-1 ring-emerald-500/15"
												: "bg-blue-500/8 ring-1 ring-blue-500/15"
										}`}
									>
										<div className="flex items-center gap-1.5">
											<span className="text-lg">
												{s.points === 3 ? "🏈" : "🏈"}
											</span>
											<span
												className={`text-[10px] font-bold uppercase tracking-wider ${
													s.teamSide === "row"
														? "text-emerald-400/80"
														: "text-blue-400/80"
												}`}
											>
												{s.label}
											</span>
										</div>
										<div className="mt-1 text-xs font-semibold text-white/50 tabular-nums">
											{s.newRowScore} - {s.newColScore}
										</div>
										<div className="mt-1.5 text-sm font-bold text-white truncate">
											{s.playerName ?? (
												<span className="text-white/20 font-normal italic">
													Unclaimed
												</span>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Players */}
					{Object.keys(pool.players).length > 0 && (
						<div>
							<h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">
								Players
							</h3>
							<div className="flex flex-wrap gap-1.5">
								{Object.entries(pool.players).map(([name, player]) => (
									<div
										key={name}
										className="flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 ring-1 ring-white/10"
									>
										<GraphicIcon
											graphic={player.identity.graphic}
											className="text-sm leading-none"
											size={14}
										/>
										<span className="text-[11px] font-semibold text-white/80">
											{name}
										</span>
										<span className="text-[10px] font-bold text-white/30">
											{player.count}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* No game started yet */}
					{!hasGame && (
						<div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
							<span className="text-3xl">🏈</span>
							<p className="text-sm font-medium text-white/40">
								Waiting for the game to start...
							</p>
							<p className="text-xs text-white/25">
								Scores will update in realtime once the admin sets them.
							</p>
						</div>
					)}

					{!numbersAssigned && hasGame && (
						<div className="rounded-lg bg-yellow-500/10 p-3 ring-1 ring-yellow-500/20">
							<p className="text-xs font-medium text-yellow-400/80">
								Numbers have not been assigned yet. Waiting for admin.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
