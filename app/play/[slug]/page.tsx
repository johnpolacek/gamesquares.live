"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { GraphicIcon } from "@/components/graphic-icon";
import { SquaresGrid } from "@/components/squares-grid";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { transformToPool } from "@/lib/convex-to-pool";
import { DEFAULT_EMOJI, searchPicker } from "@/lib/emoji-picker";
import { addPoolToHistory } from "@/lib/pool-history";
import {
	getInitials,
	getPlayerSquareCount,
	isBoardFull,
} from "@/lib/pool-store";
import type { PlayerIdentity } from "@/lib/types";

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
	possession: "home" | "away" | "none",
): WhatIfScenario[] {
	const homeScenarios: {
		label: string;
		teamSide: "row" | "col";
		points: number;
	}[] = [
		{ label: "Patriots FG", teamSide: "row", points: 3 },
		{ label: "Patriots TD", teamSide: "row", points: 7 },
	];

	const awayScenarios: {
		label: string;
		teamSide: "row" | "col";
		points: number;
	}[] = [
		{ label: "Seahawks FG", teamSide: "col", points: 3 },
		{ label: "Seahawks TD", teamSide: "col", points: 7 },
	];

	// Order: possessing team first
	const scenarios =
		possession === "away"
			? [...awayScenarios, ...homeScenarios]
			: [...homeScenarios, ...awayScenarios];

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

const PARTICIPANT_KEY_PREFIX = "gamesquares_participant_";

type StoredParticipant = {
	participantId: string;
	displayName: string;
	graphic: string;
};

export default function PlayPage() {
	const params = useParams<{ slug: string }>();
	const slug = params.slug;

	// Local state for player
	const [storedParticipant, setStoredParticipant] =
		useState<StoredParticipant | null>(null);
	const [playerName, setPlayerName] = useState("");
	const [selectedGraphic, setSelectedGraphic] = useState(DEFAULT_EMOJI);
	const [iconSearch, setIconSearch] = useState("");
	const [isJoining, setIsJoining] = useState(false);
	const [isClaiming, setIsClaiming] = useState(false);

	const filteredIcons = searchPicker(iconSearch);

	// Convex
	const poolData = useQuery(api.pools.getPoolBySlug, { slug });
	const gameData = useQuery(api.games.getCurrentGame, {});
	const joinPoolMutation = useMutation(api.participants.joinPool);
	const claimSquaresMutation = useMutation(api.squares.claimSquares);
	const releaseSquaresMutation = useMutation(api.squares.releaseSquares);

	// Load stored participant on mount
	useEffect(() => {
		const key = `${PARTICIPANT_KEY_PREFIX}${slug}`;
		const stored = localStorage.getItem(key);
		if (stored) {
			try {
				setStoredParticipant(JSON.parse(stored));
			} catch {
				localStorage.removeItem(key);
			}
		}
	}, [slug]);

	// Handle join
	const handleJoin = useCallback(async () => {
		if (!poolData?.found || isJoining) return;

		const trimmed = playerName.trim();
		if (!trimmed) return;

		setIsJoining(true);
		try {
			const result = await joinPoolMutation({
				poolId: poolData.pool._id,
				displayName: trimmed,
			});

			const participant: StoredParticipant = {
				participantId: result.participantId,
				displayName: result.displayName,
				graphic: selectedGraphic,
			};

			const key = `${PARTICIPANT_KEY_PREFIX}${slug}`;
			localStorage.setItem(key, JSON.stringify(participant));
			setStoredParticipant(participant);

			// Save to pool history so homepage can show a link back
			addPoolToHistory({
				slug,
				title: poolData.pool.title,
				role: "player",
				joinedAt: Date.now(),
			});
		} catch (err) {
			console.error("Join error:", err);
			alert("Failed to join pool. Please try again.");
		} finally {
			setIsJoining(false);
		}
	}, [
		poolData,
		playerName,
		selectedGraphic,
		slug,
		joinPoolMutation,
		isJoining,
	]);

	// Handle claim square
	const handleClaimSquare = useCallback(
		async (row: number, col: number) => {
			if (!poolData?.found || !storedParticipant || isClaiming) return;

			const index = row * 10 + col;
			setIsClaiming(true);

			try {
				await claimSquaresMutation({
					poolId: poolData.pool._id,
					participantId: storedParticipant.participantId as Id<"participants">,
					squareIndexes: [index],
				});
			} catch (err) {
				console.error("Claim error:", err);
				// Could be race condition or limit reached
			} finally {
				setIsClaiming(false);
			}
		},
		[poolData, storedParticipant, claimSquaresMutation, isClaiming],
	);

	// Handle release square
	const handleReleaseSquare = useCallback(
		async (row: number, col: number) => {
			if (!poolData?.found || isClaiming) return;

			const index = row * 10 + col;
			setIsClaiming(true);

			try {
				await releaseSquaresMutation({
					poolId: poolData.pool._id,
					squareIndexes: [index],
				});
			} catch (err) {
				console.error("Release error:", err);
			} finally {
				setIsClaiming(false);
			}
		},
		[poolData, releaseSquaresMutation, isClaiming],
	);

	// Handle square click - claim or release
	const handleSquareClick = useCallback(
		(row: number, col: number) => {
			if (!poolData?.found || !storedParticipant) return;

			const square = poolData.squares.find((s) => s.index === row * 10 + col);
			const isMySquare =
				square?.participantId === storedParticipant.participantId;

			// Check if there are still open squares (for release eligibility)
			const openSquares = poolData.squares.filter(
				(s) => !s.participantId,
			).length;

			// Calculate how many squares this player has claimed
			const mySquareCount = poolData.squares.filter(
				(s) => s.participantId === storedParticipant.participantId,
			).length;
			const maxSquares = poolData.pool.maxSquaresPerPerson;
			const canClaimMore = mySquareCount < maxSquares;

			if (isMySquare && openSquares > 0) {
				// Release this square
				handleReleaseSquare(row, col);
			} else if (!square?.participantId && canClaimMore) {
				// Claim this square (only if under limit)
				handleClaimSquare(row, col);
			}
			// If clicking empty square but at limit, do nothing gracefully
		},
		[poolData, storedParticipant, handleClaimSquare, handleReleaseSquare],
	);

	// Loading
	if (poolData === undefined) {
		return (
			<main
				className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 bg-background"
				data-testid="play-loading"
			>
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</main>
		);
	}

	// Not found
	if (!poolData.found) {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 bg-background">
				<div className="flex flex-col items-center gap-6 text-center max-w-md">
					<h1
						data-testid="play-not-found-heading"
						className="text-2xl font-bold"
					>
						Pool Not Found
					</h1>
					<p className="text-muted-foreground">
						This pool doesn&apos;t exist or may have been removed.
					</p>
					<a
						href="/"
						className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
					>
						Go to Homepage
					</a>
				</div>
			</main>
		);
	}

	// Transform pool data
	const pool = transformToPool(
		poolData.pool,
		poolData.squares,
		poolData.participants,
	);
	const boardFull = isBoardFull(pool);

	// Global game: winning square per quarter (last digit of row/col team score)
	const winningSquares =
		gameData?.found === true
			? gameData.game.quarters.map((q) => ({
					quarterLabel: q.label,
					row: q.rowTeamScore % 10,
					col: q.colTeamScore % 10,
				}))
			: [];

	// Build identity from stored participant
	const identity: PlayerIdentity | null = storedParticipant
		? {
				name: storedParticipant.displayName,
				initials: getInitials(storedParticipant.displayName),
				graphic: storedParticipant.graphic,
			}
		: null;

	const currentCount = identity ? getPlayerSquareCount(pool, identity.name) : 0;
	const remaining = Math.max(0, pool.squaresPerPerson - currentCount);
	const canPick = remaining > 0 && !boardFull && pool.status === "open";

	// Current score highlight: map latest game score (or default 0-0) to grid position
	const numbersAssigned = pool.rowNumbers.some((n) => n !== null);
	const currentScore = numbersAssigned
		? gameData?.found === true && gameData.game.quarters.length > 0
			? {
					rowDigit:
						gameData.game.quarters[gameData.game.quarters.length - 1]
							.rowTeamScore % 10,
					colDigit:
						gameData.game.quarters[gameData.game.quarters.length - 1]
							.colTeamScore % 10,
				}
			: { rowDigit: 0, colDigit: 0 }
		: null;

	// Quarter display with winner/currently-winning player per quarter
	const isGameComplete =
		gameData?.found === true && gameData.game.gameComplete === true;
	const quarterDisplays =
		gameData?.found === true && numbersAssigned
			? gameData.game.quarters.map((q, idx) => {
					const rowDigit = q.rowTeamScore % 10;
					const colDigit = q.colTeamScore % 10;
					const rowIdx = pool.rowNumbers.indexOf(rowDigit);
					const colIdx = pool.colNumbers.indexOf(colDigit);
					const playerName =
						rowIdx >= 0 &&
						colIdx >= 0 &&
						pool.squares[rowIdx]?.[colIdx]?.claimedBy?.name;
					const isLatest = idx === gameData.game.quarters.length - 1;
					const isQuarterComplete = q.complete === true;
					return {
						label: q.label,
						rowTeamScore: q.rowTeamScore,
						colTeamScore: q.colTeamScore,
						playerName: playerName ?? null,
						isLatest,
						isQuarterComplete,
					};
				})
			: null;

	// What-if scenarios for play view (show when game is active)
	const hasGame = gameData?.found === true;
	const possession = (hasGame ? gameData.game.possession : "none") as
		| "home"
		| "away"
		| "none";
	const latestQuarter =
		hasGame && gameData.game.quarters.length > 0
			? gameData.game.quarters[gameData.game.quarters.length - 1]
			: null;
	const currentRowScore = latestQuarter?.rowTeamScore ?? 0;
	const currentColScore = latestQuarter?.colTeamScore ?? 0;
	const gameIsActive = hasGame && numbersAssigned && !isGameComplete;
	const whatIfs = gameIsActive
		? computeWhatIfs(currentRowScore, currentColScore, pool, possession)
		: [];

	// Join form (not joined yet)
	if (!storedParticipant) {
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
								GameSquares.live
							</span>
						</div>
					</div>

					<div className="w-full rounded-lg bg-card p-4 ring-1 ring-border">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Pool</span>
							<span
								className="text-sm font-bold text-foreground text-right max-w-[70%] truncate"
								title={poolData.pool.title}
							>
								{poolData.pool.title}
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

					<div className="-mt-2 text-muted-foreground/80 text-xs">
						<p>
							Not sure how Squares works?{" "}
							<Link
								href="/how-to-play"
								target="_blank"
								rel="noopener noreferrer"
								className="text-muted-foreground/80 hover:text-muted-foreground underline transition-colors"
							>
								Read this how-to-play guide
							</Link>
							.
						</p>
					</div>

					{boardFull ? (
						<>
							<div className="w-full rounded-lg bg-muted p-4">
								<p className="text-sm font-semibold text-muted-foreground text-center">
									This board is full. Waiting for game to start.
								</p>
							</div>
							<div className="w-full pt-2 relative -left-1.5">
								<SquaresGrid
									pool={pool}
									onSquareClick={() => {}}
									currentPlayerName={null}
									interactive={false}
									canRelease={false}
									winningSquares={winningSquares}
									currentScore={currentScore}
								/>
							</div>
						</>
					) : (
						<div className="flex w-full flex-col gap-5">
							<div className="flex flex-col gap-2">
								<label
									htmlFor="player-name"
									className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
								>
									Your name
								</label>
								<input
									id="player-name"
									data-testid="play-player-name"
									type="text"
									value={playerName}
									onChange={(e) => setPlayerName(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && handleJoin()}
									placeholder="Enter your name"
									maxLength={16}
									className="w-full rounded-lg bg-card px-4 py-3.5 text-base text-foreground ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
								/>
							</div>

							{(playerName.trim().length > 0 || selectedGraphic) && (
								<div className="flex flex-col gap-4 border border-border rounded-lg p-2 py-4 bg-foreground/5">
									<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
										Preview — your square on the board
									</span>
									<div className="flex flex-col justify-center items-center gap-4">
										<div
											className="flex aspect-square w-20 flex-col items-center justify-center gap-0.5 rounded border-[0.5px] border-border/40 bg-white text-foreground shadow-sm sm:w-24 [&_svg]:stroke-foreground"
											aria-hidden
										>
											<GraphicIcon
												graphic={selectedGraphic}
												className="leading-none [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5"
												size={16}
											/>
											<span className="line-clamp-2 min-h-0 w-full px-0.5 text-center font-medium leading-tight text-sm pt-1">
												{playerName.trim() || "??"}
											</span>
										</div>
									</div>
								</div>
							)}

							<div className="flex w-full flex-col gap-2">
								<span className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
									Pick your icon
								</span>
								<input
									type="text"
									value={iconSearch}
									onChange={(e) => setIconSearch(e.target.value)}
									placeholder="Search icons (e.g. dog, fire, star…)"
									className="w-full rounded-lg bg-card px-3 py-2.5 text-sm text-foreground ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
								/>
								<div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-card/50 p-2">
									<div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
										{filteredIcons.map(({ value }) => (
											<button
												key={value}
												type="button"
												onClick={() => setSelectedGraphic(value)}
												className={`flex aspect-square min-w-0 items-center justify-center rounded-lg text-2xl transition-all sm:text-3xl ${
													selectedGraphic === value
														? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
														: "bg-background/80 ring-1 ring-border/60 hover:bg-primary/15 hover:ring-primary/50"
												}`}
											>
												<GraphicIcon
													graphic={value}
													className="[&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5"
													size={value.startsWith("lucide:") ? 18 : undefined}
													strokeWidth={
														value.startsWith("lucide:") ? 1.25 : undefined
													}
												/>
											</button>
										))}
									</div>
									{filteredIcons.length === 0 && (
										<p className="py-4 text-center text-sm text-muted-foreground">
											No icons match &quot;{iconSearch}&quot;
										</p>
									)}
								</div>
							</div>

							<button
								data-testid="play-join-button"
								onClick={handleJoin}
								disabled={playerName.trim().length === 0 || isJoining}
								className="w-full rounded-lg bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
								type="button"
							>
								{isJoining ? "Joining..." : "Join Pool"}
							</button>
						</div>
					)}
				</div>
			</main>
		);
	}

	// Joined view with grid
	return (
		<div className="flex min-h-dvh flex-col bg-background">
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
					<span className="font-mono text-lg opacity-70 font-bold text-foreground">
						GameSquares.live
					</span>
				</div>
				<div className="flex items-center gap-2">
					<GraphicIcon
						graphic={identity?.graphic ?? ""}
						className="text-lg leading-none"
						size={20}
					/>
					<span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
						<span className="sm:hidden">{identity?.initials}</span>
						<span className="hidden sm:inline">{identity?.name}</span>
					</span>
				</div>
			</header>

			{process.env.NODE_ENV === "development" && (
				<div className="bg-amber-500/10 px-4 py-1.5 text-center">
					<a
						href={`/api/auth/dev-admin?slug=${encodeURIComponent(slug)}`}
						className="text-xs font-medium text-amber-700 underline dark:text-amber-400"
					>
						Dev: Open admin
					</a>
				</div>
			)}

			{canPick && (
				<div className="bg-primary/10 px-4 py-2.5">
					<p className="text-center text-sm font-medium text-primary">
						Tap a square to claim it.{" "}
						<span className="font-bold">{remaining}</span> remaining.
					</p>
				</div>
			)}

			{boardFull && pool.status !== "locked" && !numbersAssigned && (
				<div className="bg-[oklch(0.85_0.15_80)] px-4 py-2.5">
					<p className="text-center text-sm font-semibold text-[oklch(0.3_0.1_80)]">
						Board is full! Waiting for admin to assign numbers.
					</p>
				</div>
			)}

			{pool.status === "locked" && (
				<div className="bg-primary/10 px-4 py-2.5">
					<p className="text-center text-sm font-semibold text-primary">
						Board is locked. Good luck!
					</p>
				</div>
			)}

			{gameData?.found && (
				<div className="w-full max-w-sm mx-4 sm:mx-auto mt-2 rounded-lg bg-card px-3 py-2 ring-1 ring-border">
					<div className="flex items-center justify-between">
						<p className="text-xs font-semibold text-muted-foreground">
							{gameData.game.name}
						</p>
						{/* Compact possession indicator */}
						{gameData.game.possession &&
							gameData.game.possession !== "none" &&
							!isGameComplete && (
								<span
									className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
										gameData.game.isRedZone ? "text-red-600" : "text-amber-600"
									}`}
								>
									🏈{" "}
									{gameData.game.possession === "home"
										? "Patriots"
										: "Seahawks"}
									{gameData.game.isRedZone && (
										<span className="rounded-full bg-red-500 px-1 py-px text-[8px] text-white animate-pulse">
											RZ
										</span>
									)}
								</span>
							)}
					</div>
					{/* Down and distance */}
					{gameData.game.downDistance && !isGameComplete && (
						<p
							className={`text-[10px] font-medium mt-0.5 ${
								gameData.game.isRedZone
									? "text-red-500"
									: "text-muted-foreground/70"
							}`}
						>
							{gameData.game.downDistance}
						</p>
					)}
					<div className="mt-1 flex flex-col gap-y-0.5 text-sm font-medium text-foreground">
						{quarterDisplays
							? quarterDisplays.map((q) => {
									const isFinal = isGameComplete && q.isLatest;
									const rowWins = isFinal && q.rowTeamScore > q.colTeamScore;
									const colWins = isFinal && q.colTeamScore > q.rowTeamScore;
									return (
										<span key={q.label}>
											{isFinal ? "FINAL" : q.label}:{" "}
											<span className={rowWins ? "font-extrabold" : ""}>
												{q.rowTeamScore}
											</span>
											–
											<span className={colWins ? "font-extrabold" : ""}>
												{q.colTeamScore}
											</span>
											{q.playerName != null &&
												` (${q.isQuarterComplete || isGameComplete ? "winner" : q.isLatest ? "currently winning" : "winner"}: ${q.playerName})`}
										</span>
									);
								})
							: gameData.game.quarters.map((q) => (
									<span key={q.label}>
										{q.label}: {q.rowTeamScore}–{q.colTeamScore}
									</span>
								))}
					</div>
				</div>
			)}

			{!canPick && !boardFull && pool.status === "open" && (
				<div className="bg-muted px-4 py-2.5">
					<p className="text-center text-sm font-medium text-muted-foreground">
						You&apos;ve picked all your squares. Tap your square to release it
						and pick a different one.
					</p>
				</div>
			)}

			<div className="px-4 pt-6 sm:pt-8 relative -left-1.5">
				<SquaresGrid
					pool={pool}
					onSquareClick={handleSquareClick}
					currentPlayerName={identity?.name ?? null}
					interactive={pool.status === "open"}
					canRelease={
						poolData?.found
							? poolData.squares.filter((s) => !s.participantId).length > 0
							: false
					}
					winningSquares={winningSquares}
					currentScore={currentScore}
				/>
			</div>

			{whatIfs.length > 0 ? (
				<div className="px-4 pt-4 pb-8">
					<h3 className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						Next Score Wins
					</h3>
					<div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
						{whatIfs.map((s) => {
							const isTeamWithBall =
								(s.teamSide === "row" && possession === "home") ||
								(s.teamSide === "col" && possession === "away");
							return (
								<div
									key={s.label}
									className={`rounded-lg p-2.5 ${
										s.teamSide === "row"
											? isTeamWithBall
												? "bg-blue-500/12 ring-2 ring-blue-500/40"
												: "bg-blue-500/8 ring-1 ring-blue-500/20"
											: isTeamWithBall
												? "bg-emerald-500/12 ring-2 ring-emerald-500/40"
												: "bg-emerald-500/8 ring-1 ring-emerald-500/20"
									}`}
								>
									<div className="flex items-center gap-1">
										<span className="text-sm">🏈</span>
										<span
											className={`text-[10px] font-bold uppercase tracking-wider ${
												s.teamSide === "row"
													? "text-blue-600"
													: "text-emerald-600"
											}`}
										>
											{s.label}
										</span>
										{isTeamWithBall && (
											<span className="ml-auto text-[8px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 rounded-full px-1 py-0.5">
												Ball
											</span>
										)}
									</div>
									<div className="mt-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
										{s.newRowScore} - {s.newColScore}
									</div>
									<div className="mt-1 text-sm font-bold text-foreground truncate">
										{s.playerName ?? (
											<span className="text-muted-foreground/40 font-normal italic text-xs">
												Unclaimed
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			) : (
				<div className="flex justify-center px-4 pt-4 pb-8">
					<div className="flex w-full max-w-xs gap-3">
						<div className="flex flex-1 flex-col items-center rounded-lg bg-card p-3 ring-1 ring-border">
							<span className="font-mono text-lg font-bold text-foreground">
								{currentCount}
							</span>
							<span className="text-[10px] font-medium text-muted-foreground">
								your picks
							</span>
						</div>
						<div className="flex flex-1 flex-col items-center rounded-lg bg-card p-3 ring-1 ring-border">
							<span className="font-mono text-lg font-bold text-foreground">
								{remaining}
							</span>
							<span className="text-[10px] font-medium text-muted-foreground">
								remaining
							</span>
						</div>
						<div className="flex flex-1 flex-col items-center rounded-lg bg-card p-3 ring-1 ring-border">
							<span className="font-mono text-lg font-bold text-foreground">
								{100 - pool.squares.flat().filter((s) => s.claimedBy).length}
							</span>
							<span className="text-[10px] font-medium text-muted-foreground">
								open
							</span>
						</div>
					</div>
				</div>
			)}
			<div className="p-4">
				<p>
					Not sure how Squares works?{" "}
					<Link
						href="/how-to-play"
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-muted-foreground/70 hover:text-muted-foreground underline transition-colors"
					>
						Read this how-to-play guide
					</Link>
					.
				</p>
			</div>
		</div>
	);
}
