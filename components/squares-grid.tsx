"use client";

import React from "react";
import { GraphicIcon } from "@/components/graphic-icon";
import type { Pool } from "@/lib/pool-store";

type SquaresGridProps = {
	pool: Pool;
	onSquareClick?: (row: number, col: number) => void;
	currentPlayerName?: string | null;
	interactive?: boolean;
	canRelease?: boolean;
};

export function SquaresGrid({
	pool,
	onSquareClick,
	currentPlayerName,
	interactive = false,
	canRelease = false,
}: SquaresGridProps) {
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

								return (
									<button
										key={`${square.row}-${square.col}`}
										onClick={() => onSquareClick?.(square.row, square.col)}
										disabled={!canClick}
										className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 overflow-hidden border-[0.5px] border-border/40 transition-all ${
											canClick
												? "cursor-pointer hover:ring-2 hover:ring-border hover:ring-inset active:scale-95"
												: "cursor-default"
										} ${isClaimed ? "bg-white text-foreground" : "bg-card"} ${
											isCurrentPlayer ? "ring-2 ring-primary ring-inset" : ""
										}`}
										type="button"
										aria-label={
											isClaimed
												? `Square claimed by ${square.claimedBy?.name ?? ""}`
												: `Empty square at row ${square.row + 1}, column ${square.col + 1}`
										}
									>
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
