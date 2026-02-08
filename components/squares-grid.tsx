"use client";

import React from "react";
import { GraphicIcon } from "@/components/graphic-icon";
import type { Pool } from "@/lib/pool-store";

export type WinningSquare = { quarterLabel: string; row: number; col: number };

type SquaresGridProps = {
	pool: Pool;
	onSquareClick?: (row: number, col: number) => void;
	currentPlayerName?: string | null;
	interactive?: boolean;
	canRelease?: boolean;
	/** Winning (row, col) per quarter from global game scores (last digit of row/col team score) */
	winningSquares?: WinningSquare[];
	/** Current live score digits to highlight the "in play" square */
	currentScore?: { rowDigit: number; colDigit: number } | null;
};

// Per-quarter color palette: ring, background tint, badge background
const QUARTER_COLORS: Record<
	string,
	{ ring: string; bg: string; badge: string }
> = {
	Q1: {
		ring: "oklch(0.60 0.20 145)", // green
		bg: "oklch(0.60 0.20 145 / 0.12)",
		badge: "oklch(0.45 0.15 145)",
	},
	Q2: {
		ring: "oklch(0.55 0.20 260)", // blue
		bg: "oklch(0.55 0.20 260 / 0.12)",
		badge: "oklch(0.42 0.15 260)",
	},
	Q3: {
		ring: "oklch(0.60 0.22 25)", // orange/red
		bg: "oklch(0.60 0.22 25 / 0.12)",
		badge: "oklch(0.48 0.18 25)",
	},
	Q4: {
		ring: "oklch(0.65 0.18 85)", // gold
		bg: "oklch(0.65 0.18 85 / 0.15)",
		badge: "oklch(0.50 0.15 85)",
	},
};
const DEFAULT_Q_COLOR = QUARTER_COLORS.Q1;

export function SquaresGrid({
	pool,
	onSquareClick,
	currentPlayerName,
	interactive = false,
	canRelease = false,
	winningSquares = [],
	currentScore = null,
}: SquaresGridProps) {
	// Map score digits to grid indices via pool.rowNumbers / pool.colNumbers
	// Store both the label text and the first (primary) quarter for coloring
	const winningByKey = new Map<string, { label: string; quarter: string }>();
	for (const w of winningSquares) {
		const rowIdx = pool.rowNumbers.indexOf(w.row);
		const colIdx = pool.colNumbers.indexOf(w.col);
		if (rowIdx >= 0 && colIdx >= 0) {
			const k = `${rowIdx},${colIdx}`;
			const existing = winningByKey.get(k);
			if (existing) {
				winningByKey.set(k, {
					label: `${existing.label} ${w.quarterLabel}`,
					quarter: existing.quarter, // keep earliest quarter for color
				});
			} else {
				winningByKey.set(k, { label: w.quarterLabel, quarter: w.quarterLabel });
			}
		}
	}

	// Map current score digits to grid index
	let currentScoreKey: string | null = null;
	if (currentScore) {
		const rowIdx = pool.rowNumbers.indexOf(currentScore.rowDigit);
		const colIdx = pool.colNumbers.indexOf(currentScore.colDigit);
		if (rowIdx >= 0 && colIdx >= 0) {
			currentScoreKey = `${rowIdx},${colIdx}`;
		}
	}
	return (
		<div className="mx-auto w-full max-w-lg opacity-0 animate-fade-in-up">
			{/* Away team (Seahawks) label above column headers */}
			<div className="flex items-center justify-center pb-1 pl-5">
				<div className="flex items-center gap-1.5">
					<div className="h-2 w-2 rounded-full bg-away-team" />
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Seahawks
					</span>
				</div>
			</div>

			<div className="relative">
				{/* Home team (Patriots) label rotated vertically - absolutely positioned */}
				<div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-5">
					<div className="flex -rotate-90 items-center gap-1.5 whitespace-nowrap">
						<div className="h-2 w-2 rounded-full bg-home-team" />
						<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Patriots
						</span>
					</div>
				</div>

				<div
					className="grid ml-5"
					style={{
						gridTemplateColumns: `minmax(18px, 0.5fr) repeat(10, 1fr)`,
						gridTemplateRows: `minmax(18px, 0.5fr) repeat(10, 1fr)`,
					}}
				>
					{/* Corner cell */}
					<div className="flex items-center justify-center" />

					{/* Column headers - Away team (Seahawks) numbers */}
					{Array.from({ length: 10 }, (_, i) => {
						const hasNumber = pool.colNumbers[i] !== null;
						return (
							<div
								key={`col-${i}`}
								className={`flex items-center justify-center bg-away-team ${hasNumber ? "opacity-0 animate-fade-in-up" : ""}`}
								style={hasNumber ? { animationDelay: `${i * 30}ms` } : undefined}
							>
								<span className="text-[10px] font-bold text-away-team-foreground md:text-xs">
									{pool.colNumbers[i] ?? "?"}
								</span>
							</div>
						);
					})}

					{/* Rows */}
					{pool.squares.map((row, rowIdx) => (
						<React.Fragment key={rowIdx}>
							{/* Row header - Home team (Patriots) numbers */}
							<div
								className={`flex items-center justify-center bg-home-team ${pool.rowNumbers[rowIdx] !== null ? "opacity-0 animate-fade-in-up" : ""}`}
								style={pool.rowNumbers[rowIdx] !== null ? { animationDelay: `${rowIdx * 30}ms` } : undefined}
							>
								<span className="text-[10px] font-bold text-home-team-foreground md:text-xs">
									{pool.rowNumbers[rowIdx] ?? "?"}
								</span>
							</div>

							{/* Square cells */}
							{row.map((square) => {
								const isClaimed = square.claimedBy !== null;
								const isCurrentPlayer =
									currentPlayerName &&
									square.claimedBy?.name === currentPlayerName;
								const canClick =
									interactive &&
									(!isClaimed || (canRelease && isCurrentPlayer));
								const squareKey = `${square.row},${square.col}`;
								const winnerInfo = winningByKey.get(squareKey);
								const isCurrentScoreSquare = currentScoreKey === squareKey;
								const qColor = winnerInfo
									? (QUARTER_COLORS[winnerInfo.quarter] ?? DEFAULT_Q_COLOR)
									: null;

								return (
									<button
										key={`${square.row}-${square.col}`}
										onClick={() => onSquareClick?.(square.row, square.col)}
										disabled={!canClick}
										style={
											winnerInfo && qColor
												? {
														background: qColor.bg,
														boxShadow: `inset 0 0 0 2px ${qColor.ring}`,
													}
												: isCurrentScoreSquare
													? {
															background: "oklch(0.92 0.12 90 / 0.3)",
															boxShadow: "inset 0 0 0 2px oklch(0.75 0.12 85)",
														}
													: undefined
										}
										data-winner={winnerInfo ? "true" : undefined}
										data-live-score={isCurrentScoreSquare && !winnerInfo ? "true" : undefined}
										className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 overflow-hidden border-[0.5px] border-border/40 transition-all duration-200 ease-out ${
											!winnerInfo && !isCurrentScoreSquare
												? isClaimed
													? "bg-white"
													: "bg-card"
												: ""
										} ${
											winnerInfo ? "animate-winner-glow" : ""
										} ${
											isCurrentScoreSquare && !winnerInfo ? "animate-score-breathe" : ""
										} ${
											canClick
												? "cursor-pointer hover:ring-2 hover:ring-border hover:ring-inset hover:scale-[1.02] active:scale-95"
												: "cursor-default"
										} ${isClaimed ? "text-foreground" : ""} ${
											isCurrentPlayer ? "ring-2 ring-primary ring-inset" : ""
										}`}
										type="button"
										aria-label={
											isClaimed
												? `Square claimed by ${square.claimedBy?.name ?? ""}`
												: `Empty square at row ${square.row + 1}, column ${square.col + 1}`
										}
									>
										{winnerInfo && qColor && (
											<span
												className="absolute right-0 top-0 px-0.5 text-[5px] font-normal text-white"
												style={{ background: qColor.badge }}
											>
												{winnerInfo.label}
											</span>
										)}
										{isCurrentScoreSquare && !winnerInfo && (
											<span className="absolute right-0.5 top-0.5 rounded bg-[oklch(0.55_0.15_85)] px-1 text-[6px] font-bold text-white">
												★
											</span>
										)}
										{isClaimed && square.claimedBy && (
											<div className="flex flex-col items-center gap-0.5 animate-square-claim">
												<GraphicIcon
													graphic={square.claimedBy.graphic}
													className="text-[8px] relative top-0.5 leading-none h-3 w-3 flex items-center justify-center overflow-hidden [&>svg]:h-2.5 [&>svg]:w-2.5 [&_svg]:stroke-foreground"
													size={10}
												/>
												<span className="line-clamp-2 w-full px-0.5 text-center text-[5px] font-normal leading-tight md:text-[6px]">
													{square.claimedBy.name}
												</span>
											</div>
										)}
									</button>
								);
							})}
						</React.Fragment>
					))}
				</div>
			</div>
		</div>
	);
}
