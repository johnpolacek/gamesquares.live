"use client";

import { useState } from "react";
import { SquaresGrid } from "@/components/squares-grid";
import type { PlayerIdentity, Pool } from "@/lib/pool-store";
import {
	AVAILABLE_GRAPHICS,
	getInitials,
	getPlayerSquareCount,
	isBoardFull,
} from "@/lib/pool-store";

type PlayerBoardProps = {
	pool: Pool;
	onClaimSquare: (identity: PlayerIdentity, row: number, col: number) => void;
};

export function PlayerBoard({ pool, onClaimSquare }: PlayerBoardProps) {
	const [playerName, setPlayerName] = useState("");
	const [selectedGraphic, setSelectedGraphic] = useState(AVAILABLE_GRAPHICS[0]);
	const [isJoined, setIsJoined] = useState(false);
	const [identity, setIdentity] = useState<PlayerIdentity | null>(null);
	const boardFull = isBoardFull(pool);

	const handleJoin = () => {
		const trimmed = playerName.trim();
		if (trimmed.length > 0) {
			const id: PlayerIdentity = {
				name: trimmed,
				initials: getInitials(trimmed),
				graphic: selectedGraphic,
			};
			setIdentity(id);
			setIsJoined(true);
		}
	};

	const currentCount = identity ? getPlayerSquareCount(pool, identity.name) : 0;
	const remaining = pool.squaresPerPerson - currentCount;
	const canPick = remaining > 0 && !boardFull;

	if (!isJoined) {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 bg-background">
				<div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
					<div className="flex flex-col items-center gap-3">
						<div className="flex items-center gap-2">
							<svg
								width="28"
								height="28"
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
							<span className="font-mono text-lg font-bold text-foreground">
								GameSquares
							</span>
						</div>
					</div>

					<div className="w-full rounded-lg bg-card p-4 ring-1 ring-border">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Pool</span>
							<span className="font-mono text-sm font-bold text-foreground">
								{pool.id}
							</span>
						</div>
						<div className="my-2.5 h-px bg-border" />
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">
								Squares per player
							</span>
							<span className="text-sm font-semibold text-foreground">
								{pool.squaresPerPerson}
							</span>
						</div>
						<div className="my-2.5 h-px bg-border" />
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Available</span>
							<span className="text-sm font-semibold text-foreground">
								{100 - pool.squares.flat().filter((s) => s.claimedBy).length}
							</span>
						</div>
					</div>

					{boardFull ? (
						<div className="w-full rounded-lg bg-muted p-4">
							<p className="text-sm font-semibold text-muted-foreground">
								This board is full. Check back later.
							</p>
						</div>
					) : (
						<div className="flex w-full flex-col gap-5">
							{/* Name input */}
							<div className="flex flex-col gap-2">
								<label
									htmlFor="player-name"
									className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
								>
									Your name
								</label>
								<input
									id="player-name"
									type="text"
									value={playerName}
									onChange={(e) => setPlayerName(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleJoin()}
									placeholder="Enter your name"
									maxLength={16}
									className="w-full rounded-lg bg-card px-4 py-3.5 text-base text-foreground ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
								/>
							</div>

							{/* Initials preview */}
							{playerName.trim().length > 0 && (
								<div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 ring-1 ring-border/50">
									<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
										<span className="text-lg">{selectedGraphic}</span>
									</div>
									<div className="flex flex-col text-left">
										<span className="text-xs font-bold text-foreground">
											{getInitials(playerName.trim())}
										</span>
										<span className="text-xs text-muted-foreground">
											Your square will show this
										</span>
									</div>
								</div>
							)}

							{/* Graphic picker */}
							<div className="flex flex-col gap-2">
								<span className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Pick your icon
								</span>
								<div className="grid grid-cols-10 gap-1.5">
									{AVAILABLE_GRAPHICS.map((g) => (
										<button
											key={g}
											type="button"
											onClick={() => setSelectedGraphic(g)}
											className={`flex aspect-square items-center justify-center rounded-md text-lg transition-all ${
												selectedGraphic === g
													? "bg-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
													: "bg-card ring-1 ring-border hover:ring-primary/50"
											}`}
										>
											{g}
										</button>
									))}
								</div>
							</div>

							<button
								onClick={handleJoin}
								disabled={playerName.trim().length === 0}
								className="w-full rounded-lg bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
								type="button"
							>
								Join Pool
							</button>
						</div>
					)}
				</div>
			</main>
		);
	}

	return (
		<div className="flex min-h-dvh flex-col bg-background opacity-0 animate-fade-in-up">
			<header className="flex items-center justify-between px-4 py-3 bg-card shadow-sm ring-1 ring-border/50">
				<div className="flex items-center gap-2">
					<svg
						width="24"
						height="24"
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
					<span className="font-mono text-sm font-bold text-foreground">
						{pool.id}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-lg leading-none">{identity?.graphic}</span>
					<span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
						{identity?.initials}
					</span>
				</div>
			</header>

			{canPick && (
				<div key="banner-pick" className="bg-primary/10 px-4 py-2.5 animate-fade-in-up">
					<p className="text-center text-sm font-medium text-primary">
						{"Tap a square to claim it. "}
						<span className="font-bold">{remaining}</span>
						{" remaining."}
					</p>
				</div>
			)}

			{boardFull && pool.status !== "locked" && (
				<div key="banner-full" className="bg-[oklch(0.85_0.15_80)] px-4 py-2.5 animate-fade-in-up">
					<p className="text-center text-sm font-semibold text-[oklch(0.3_0.1_80)]">
						Board is full! Waiting for admin to assign numbers.
					</p>
				</div>
			)}

			{pool.status === "locked" && (
				<div key="banner-locked" className="bg-primary/10 px-4 py-2.5 animate-fade-in-up">
					<p className="text-center text-sm font-semibold text-primary">
						Board is locked. Good luck!
					</p>
				</div>
			)}

			{!canPick && !boardFull && (
				<div key="banner-done" className="bg-muted px-4 py-2.5 animate-fade-in-up">
					<p className="text-center text-sm font-medium text-muted-foreground">
						{"You've picked all your squares. Waiting for others."}
					</p>
				</div>
			)}

			<div className="flex items-center gap-4 px-4 pt-3 pb-2">
				<div className="flex items-center gap-1.5">
					<div className="h-2 w-2 rounded-full bg-away-team" />
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Seahawks
					</span>
					<svg
						width="10"
						height="10"
						viewBox="0 0 10 10"
						fill="none"
						aria-hidden="true"
						className="text-muted-foreground"
					>
						<path
							d="M2 5H8M8 5L5.5 2.5M8 5L5.5 7.5"
							stroke="currentColor"
							strokeWidth="1"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>
				<div className="flex items-center gap-1.5">
					<div className="h-2 w-2 rounded-full bg-home-team" />
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Patriots
					</span>
					<svg
						width="10"
						height="10"
						viewBox="0 0 10 10"
						fill="none"
						aria-hidden="true"
						className="text-muted-foreground rotate-90"
					>
						<path
							d="M2 5H8M8 5L5.5 2.5M8 5L5.5 7.5"
							stroke="currentColor"
							strokeWidth="1"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>
			</div>

			<div className="px-4">
				<SquaresGrid
					pool={pool}
					onSquareClick={(row, col) => {
						if (canPick && identity) {
							onClaimSquare(identity, row, col);
						}
					}}
					highlightPlayer={identity?.name ?? null}
					interactive={canPick}
				/>
			</div>

			<div className="flex gap-3 px-4 pt-4 pb-8">
				<div key={`picks-${currentCount}`} className="flex flex-1 flex-col items-center rounded-lg bg-card p-3 ring-1 ring-border animate-highlight">
					<span className="font-mono text-lg font-bold tabular-nums text-foreground">
						{currentCount}
					</span>
					<span className="text-[10px] font-medium text-muted-foreground">
						your picks
					</span>
				</div>
				<div key={`remaining-${remaining}`} className="flex flex-1 flex-col items-center rounded-lg bg-card p-3 ring-1 ring-border animate-highlight">
					<span className="font-mono text-lg font-bold tabular-nums text-foreground">
						{remaining}
					</span>
					<span className="text-[10px] font-medium text-muted-foreground">
						remaining
					</span>
				</div>
				<div key={`open-${100 - pool.squares.flat().filter((s) => s.claimedBy).length}`} className="flex flex-1 flex-col items-center rounded-lg bg-card p-3 ring-1 ring-border animate-highlight">
					<span className="font-mono text-lg font-bold tabular-nums text-foreground">
						{100 - pool.squares.flat().filter((s) => s.claimedBy).length}
					</span>
					<span className="text-[10px] font-medium text-muted-foreground">
						open
					</span>
				</div>
			</div>
		</div>
	);
}
