"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GraphicIcon } from "@/components/graphic-icon";
import { SquaresGrid } from "@/components/squares-grid";
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
	pool: {
		rowNumbers: (number | null)[];
		colNumbers: (number | null)[];
		squares: { claimedBy: { name: string } | null }[][];
	},
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
	pool: {
		rowNumbers: (number | null)[];
		colNumbers: (number | null)[];
		squares: { claimedBy: { name: string } | null }[][];
	},
): WhatIfScenario[] {
	const scenarios: {
		label: string;
		teamSide: "row" | "col";
		points: number;
	}[] = [
		{ label: "Eagles FG", teamSide: "row", points: 3 },
		{ label: "Eagles TD", teamSide: "row", points: 7 },
		{ label: "Patriots FG", teamSide: "col", points: 3 },
		{ label: "Patriots TD", teamSide: "col", points: 7 },
	];

	return scenarios.map((s) => {
		const newRowScore =
			s.teamSide === "row" ? currentRowScore + s.points : currentRowScore;
		const newColScore =
			s.teamSide === "col" ? currentColScore + s.points : currentColScore;
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

	// Scale the grid to fill available space while keeping proportions
	const containerRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const [gridScale, setGridScale] = useState(1);

	// Re-run when poolData/gameData change (grid may not be in DOM until data loads)
	const dataReady = poolData?.found === true;

	useEffect(() => {
		if (!dataReady) return;
		const container = containerRef.current;
		const grid = gridRef.current;
		if (!container || !grid) return;

		const gridEl = grid;
		const containerEl = container;

		function recalc() {
			// Reset scale to 1 so we can measure the grid's natural size
			gridEl.style.transform = "scale(1)";
			const gw = gridEl.offsetWidth;
			const gh = gridEl.offsetHeight;
			const cw = containerEl.clientWidth;
			const ch = containerEl.clientHeight;
			if (gw === 0 || gh === 0) return;
			// Scale to fit with a little breathing room at the edges
			const scale = Math.min(cw / gw, ch / gh) * 0.92;
			setGridScale(scale);
			gridEl.style.transform = `scale(${scale})`;
		}

		recalc();
		const ro = new ResizeObserver(() => recalc());
		ro.observe(containerEl);
		return () => ro.disconnect();
	}, [dataReady]);

	// Loading
	if (poolData === undefined) {
		return (
			<main
				className="flex h-dvh items-center justify-center bg-background"
				data-testid="view-loading"
			>
				<div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
			</main>
		);
	}

	// Not found
	if (!poolData.found) {
		return (
			<main className="flex h-dvh flex-col items-center justify-center bg-background">
				<h1
					data-testid="view-not-found"
					className="text-2xl font-bold text-foreground"
				>
					Pool Not Found
				</h1>
				<p className="mt-2 text-muted-foreground">
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
	const latestQuarter =
		quarters.length > 0 ? quarters[quarters.length - 1] : null;
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
			className="flex h-dvh flex-col overflow-hidden bg-background text-foreground"
			data-testid="view-scoreboard"
		>
			{/* Header */}
			<header className="flex shrink-0 items-center justify-between px-6 py-3 bg-white border-b border-border">
				<div className="flex items-center gap-3">
					<svg
						width="28"
						height="28"
						viewBox="0 0 32 32"
						fill="none"
						className="text-emerald-500"
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
					<span className="text-lg font-bold text-foreground/70 tracking-wide">
						GameSquares<span className="text-emerald-500">.live</span>
					</span>
				</div>
				<div className="flex items-center gap-4">
					{game && (
						<span className="text-sm font-semibold text-foreground/80">
							{game.name.replace(/ at /i, " vs ")}
						</span>
					)}
					{isGameComplete && (
						<span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-600 animate-scale-in">
							Final
						</span>
					)}
					{!isGameComplete && hasGame && (
						<span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-500 animate-pulse">
							Live
						</span>
					)}
				</div>
			</header>

			{/* Main content */}
			<div className="flex flex-1 min-h-0">
				{/* Left side: Grid - scaled to fill available space with breathing room */}
				<div
					ref={containerRef}
					className="flex flex-1 items-center justify-center overflow-hidden min-w-0"
				>
					<div
						ref={gridRef}
						className="w-fit"
						style={{
							transform: `scale(${gridScale})`,
							transformOrigin: "center center",
						}}
					>
						<SquaresGrid
							pool={pool}
							interactive={false}
							winningSquares={winningSquares}
							currentScore={currentScore}
						/>
					</div>
				</div>

				{/* Right side: Scoreboard info */}
				<div className="flex w-[420px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-white/50 p-6">
					{/* Current score */}
					{hasGame && (
						<div data-testid="view-score-bar">
							<h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
								Score
							</h3>
							<div className="flex items-center justify-center gap-6 rounded-lg bg-white p-5 ring-1 ring-border">
								<div className="flex flex-col items-center">
									<span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
										Eagles
									</span>
									<span
										key={`eagles-${currentRowScore}`}
										className="text-5xl font-black tabular-nums text-foreground animate-score-pop"
										data-testid="view-eagles-score"
									>
										{currentRowScore}
									</span>
								</div>
								<div className="flex flex-col items-center">
									<span className="text-base font-bold text-muted-foreground/40">
										vs
									</span>
									{latestQuarter && !isGameComplete && (
										<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
											{latestQuarter.label}
										</span>
									)}
									{isGameComplete && (
										<span className="text-xs font-bold text-emerald-600 uppercase tracking-wider animate-scale-in">
											Final
										</span>
									)}
								</div>
								<div className="flex flex-col items-center">
									<span className="text-xs font-bold uppercase tracking-wider text-blue-600">
										Patriots
									</span>
									<span
										key={`patriots-${currentColScore}`}
										className="text-5xl font-black tabular-nums text-foreground animate-score-pop"
										data-testid="view-patriots-score"
									>
										{currentColScore}
									</span>
								</div>
							</div>
						</div>
					)}

					{/* Quarter scores */}
					{quarterDisplays.length > 0 && (
						<div data-testid="view-quarter-scores">
							<h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
								Scoring
							</h3>
							<div className="flex flex-col gap-2.5">
								{quarterDisplays.map((q, idx) => {
									const isFinal = isGameComplete && q.isLatest;
									const eaglesWinning = q.rowTeamScore > q.colTeamScore;
									const patriotsWinning = q.colTeamScore > q.rowTeamScore;
									return (
										<div
											key={q.label}
											className={`rounded-lg p-3.5 opacity-0 animate-fade-in-up ${
												q.isLatest && !isGameComplete
													? "bg-emerald-500/10 ring-1 ring-emerald-500/30"
													: "bg-white ring-1 ring-border"
											}`}
											style={{ animationDelay: `${idx * 60}ms` }}
										>
											<div className="flex items-center justify-between">
												<span className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
													{isFinal ? "FINAL" : q.label}
												</span>
												{q.playerName && (
													<span
														className={`text-xs font-bold uppercase tracking-wider ${
															q.isComplete || isGameComplete
																? "text-emerald-600"
																: "text-yellow-500"
														}`}
													>
														{q.isComplete || isGameComplete
															? "Winner"
															: "Winning"}
													</span>
												)}
											</div>
											<div className="mt-1.5 flex items-baseline gap-2">
												<span
													className={`text-xl font-bold tabular-nums ${
														eaglesWinning
															? "text-emerald-600"
															: "text-foreground"
													}`}
												>
													{q.rowTeamScore}
												</span>
												<span className="text-muted-foreground/40">-</span>
												<span
													className={`text-xl font-bold tabular-nums ${
														patriotsWinning
															? "text-blue-600"
															: "text-foreground"
													}`}
												>
													{q.colTeamScore}
												</span>
												{q.playerName && (
													<span className="ml-auto text-base font-bold text-foreground truncate max-w-[140px]">
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
							<h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
								Next Score Wins
							</h3>
							<div className="grid grid-cols-2 gap-2.5">
								{whatIfs.map((s) => (
									<div
										key={s.label}
										className={`rounded-lg p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
											s.teamSide === "row"
												? "bg-emerald-500/8 ring-1 ring-emerald-500/20"
												: "bg-blue-500/8 ring-1 ring-blue-500/20"
										}`}
									>
										<div className="flex items-center gap-1.5">
											<span className="text-xl">
												{s.points === 3 ? "🏈" : "🏈"}
											</span>
											<span
												className={`text-xs font-bold uppercase tracking-wider ${
													s.teamSide === "row"
														? "text-emerald-600"
														: "text-blue-600"
												}`}
											>
												{s.label}
											</span>
										</div>
										<div className="mt-1.5 text-sm font-semibold text-muted-foreground tabular-nums">
											{s.newRowScore} - {s.newColScore}
										</div>
										<div className="mt-2 text-base font-bold text-foreground truncate">
											{s.playerName ?? (
												<span className="text-muted-foreground/40 font-normal italic">
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
							<h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
								Players
							</h3>
							<div className="flex flex-wrap gap-2">
								{Object.entries(pool.players).map(([name, player]) => (
									<div
										key={name}
										className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-border"
									>
										<GraphicIcon
											graphic={player.identity.graphic}
											className="text-base leading-none"
											size={16}
										/>
										<span className="text-sm font-semibold text-foreground/80">
											{name}
										</span>
										<span className="text-xs font-bold text-muted-foreground">
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
							<span className="text-4xl">🏈</span>
							<p className="text-base font-medium text-muted-foreground">
								Waiting for the game to start...
							</p>
							<p className="text-sm text-muted-foreground/60">
								Scores will update in realtime once the admin sets them.
							</p>
						</div>
					)}

					{!numbersAssigned && hasGame && (
						<div className="rounded-lg bg-yellow-500/10 p-4 ring-1 ring-yellow-500/30">
							<p className="text-sm font-medium text-yellow-600">
								Numbers have not been assigned yet. Waiting for admin.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
