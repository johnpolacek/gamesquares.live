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
	const winningByKey = new Map<string, string>();
	for (const w of winningSquares) {
		const rowIdx = pool.rowNumbers.indexOf(w.row);
		const colIdx = pool.colNumbers.indexOf(w.col);
		if (rowIdx >= 0 && colIdx >= 0) {
			const k = `${rowIdx},${colIdx}`;
			const existing = winningByKey.get(k);
			winningByKey.set(
				k,
				existing ? `${existing} ${w.quarterLabel}` : w.quarterLabel,
			);
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
		<div className="mx-auto w-full max-w-lg">
			{/* Patriots label above column headers */}
			<div className="flex items-center justify-center pb-1 pl-5">
				<div className="flex items-center gap-1.5">
					<div className="h-2 w-2 rounded-full bg-patriots" />
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Patriots
					</span>
				</div>
			</div>

			<div className="relative">
				{/* Eagles label rotated vertically - absolutely positioned */}
				<div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-5">
					<div className="flex -rotate-90 items-center gap-1.5 whitespace-nowrap">
						<div className="h-2 w-2 rounded-full bg-eagles" />
						<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
							Eagles
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

					{/* Column headers - Patriots numbers */}
					{Array.from({ length: 10 }, (_, i) => (
						<div
							key={`col-${i}`}
							className="flex items-center justify-center bg-patriots"
						>
							<span className="text-[10px] font-bold text-patriots-foreground md:text-xs">
								{pool.colNumbers[i] ?? "?"}
							</span>
						</div>
					))}

					{/* Rows */}
					{pool.squares.map((row, rowIdx) => (
						<React.Fragment key={rowIdx}>
							{/* Row header - Eagles numbers */}
							<div className="flex items-center justify-center bg-eagles">
								<span className="text-[10px] font-bold text-eagles-foreground md:text-xs">
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
								const quarterWinner = winningByKey.get(squareKey);
								const isCurrentScoreSquare = currentScoreKey === squareKey;

								// Single background so highlight isn't overridden by bg-white
								const bgClass = quarterWinner
									? "bg-[oklch(0.55_0.22_25/0.15)]"
									: isCurrentScoreSquare
										? "bg-[oklch(0.75_0.15_85/0.15)]"
										: isClaimed
											? "bg-white"
											: "bg-card";

								return (
									<button
										key={`${square.row}-${square.col}`}
										onClick={() => onSquareClick?.(square.row, square.col)}
										disabled={!canClick}
										className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 overflow-hidden border-[0.5px] border-border/40 transition-all ${bgClass} ${
											canClick
												? "cursor-pointer hover:ring-2 hover:ring-border hover:ring-inset active:scale-95"
												: "cursor-default"
										} ${isClaimed ? "text-foreground" : ""} ${
											isCurrentPlayer ? "ring-2 ring-primary ring-inset" : ""
										} ${
											quarterWinner
												? "ring-2 ring-[oklch(0.55_0.22_25)] ring-inset"
												: ""
										} ${
											isCurrentScoreSquare && !quarterWinner
												? "ring-2 ring-[oklch(0.75_0.15_85)] ring-inset"
												: ""
										}`}
										type="button"
										aria-label={
											isClaimed
												? `Square claimed by ${square.claimedBy?.name ?? ""}`
												: `Empty square at row ${square.row + 1}, column ${square.col + 1}`
										}
									>
										{quarterWinner && (
											<span className="absolute right-0.5 top-0.5 rounded bg-destructive/90 px-1 text-[6px] font-bold text-destructive-foreground">
												{quarterWinner}
											</span>
										)}
										{isCurrentScoreSquare && !quarterWinner && (
											<span className="absolute right-0.5 top-0.5 rounded bg-[oklch(0.55_0.15_85)] px-1 text-[6px] font-bold text-white">
												★
											</span>
										)}
										{isClaimed && square.claimedBy && (
											<>
												<GraphicIcon
													graphic={square.claimedBy.graphic}
													className="text-[10px] leading-none md:text-sm [&>svg]:h-3 [&>svg]:w-3 md:[&>svg]:h-3.5 md:[&>svg]:w-3.5 [&_svg]:stroke-foreground"
													size={14}
												/>
												<span className="line-clamp-2 w-full px-0.5 text-center text-[6px] font-bold leading-tight md:text-[7px]">
													{square.claimedBy.name}
												</span>
											</>
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
