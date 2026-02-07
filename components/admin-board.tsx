"use client";

import { useState } from "react";
import { GraphicIcon } from "@/components/graphic-icon";
import { SquaresGrid, type WinningSquare } from "@/components/squares-grid";
import type { Pool } from "@/lib/pool-store";
import { getClaimedCount } from "@/lib/pool-store";

type AdminBoardProps = {
	pool: Pool;
	shareUrl: string;
	maxSquaresPerPerson: number;
	onUpdateMaxSquares: (
		newMax: number,
	) => Promise<{ ok: boolean; error?: string }>;
	onAssignNumbers: () => Promise<void>;
	onDistributeSquares: () => Promise<{
		ok: boolean;
		distributed: number;
		error?: string;
	}>;
	winningSquares?: WinningSquare[];
	currentScore?: { rowDigit: number; colDigit: number } | null;
};

const SQUARES_OPTIONS = [1, 2, 4, 5, 10, 20, 25, 50];

export function AdminBoard({
	pool,
	shareUrl,
	maxSquaresPerPerson,
	onUpdateMaxSquares,
	onAssignNumbers,
	onDistributeSquares,
	winningSquares = [],
	currentScore = null,
}: AdminBoardProps) {
	const [copied, setCopied] = useState(false);
	const [copiedView, setCopiedView] = useState(false);
	const viewUrl = shareUrl.replace(/\/play\//, "/view/");
	const [maxError, setMaxError] = useState<string | null>(null);
	const [isAssigning, setIsAssigning] = useState(false);
	const [isDistributing, setIsDistributing] = useState(false);
	const [showConfirmNumbers, setShowConfirmNumbers] = useState(false);
	const [showConfirmReassign, setShowConfirmReassign] = useState(false);
	const [showConfirmDistribute, setShowConfirmDistribute] = useState(false);
	const claimedCount = getClaimedCount(pool);
	const openCount = 100 - claimedCount;
	const allPlayerNames = Object.keys(pool.players);
	const numbersAssigned = pool.rowNumbers.some((n) => n !== null);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			const textArea = document.createElement("textarea");
			textArea.value = shareUrl;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand("copy");
			document.body.removeChild(textArea);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleCopyView = async () => {
		try {
			await navigator.clipboard.writeText(viewUrl);
			setCopiedView(true);
			setTimeout(() => setCopiedView(false), 2000);
		} catch {
			const textArea = document.createElement("textarea");
			textArea.value = viewUrl;
			document.body.appendChild(textArea);
			textArea.select();
			document.execCommand("copy");
			document.body.removeChild(textArea);
			setCopiedView(true);
			setTimeout(() => setCopiedView(false), 2000);
		}
	};

	const handleMaxChange = async (newMax: number) => {
		setMaxError(null);
		const result = await onUpdateMaxSquares(newMax);
		if (!result.ok && result.error) {
			setMaxError(result.error);
		}
	};

	const handleAssignClick = () => {
		if (numbersAssigned) {
			setShowConfirmReassign(true);
		} else if (openCount > 0) {
			setShowConfirmNumbers(true);
		} else {
			handleAssignConfirmed();
		}
	};

	const handleAssignConfirmed = async () => {
		setShowConfirmNumbers(false);
		setIsAssigning(true);
		try {
			await onAssignNumbers();
		} finally {
			setIsAssigning(false);
		}
	};

	const handleDistributeClick = () => {
		setShowConfirmDistribute(true);
	};

	const handleDistributeConfirmed = async () => {
		setShowConfirmDistribute(false);
		setIsDistributing(true);
		try {
			await onDistributeSquares();
		} finally {
			setIsDistributing(false);
		}
	};

	const handleDistributeAndAssign = async () => {
		setShowConfirmNumbers(false);
		setIsDistributing(true);
		try {
			await onDistributeSquares();
		} finally {
			setIsDistributing(false);
		}
		setIsAssigning(true);
		try {
			await onAssignNumbers();
		} finally {
			setIsAssigning(false);
		}
	};

	return (
		<div
			className="flex min-h-dvh flex-col bg-background"
			data-testid="admin-board"
		>
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
				<div className="flex items-center gap-3">
					<StatusBadge status={pool.status} numbersAssigned={numbersAssigned} />
					<span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						Admin
					</span>
				</div>
			</header>

			{/* Share URLs */}
			<div className="mx-auto w-full max-w-lg px-4 pt-4 space-y-3">
				<div>
					<p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Play (pick squares)
					</p>
					<div className="flex gap-2">
						<div className="flex flex-1 items-center overflow-hidden rounded-lg bg-card ring-1 ring-border">
							<span className="truncate px-3 py-2.5 text-xs text-muted-foreground">
								{shareUrl}
							</span>
						</div>
						<button
							onClick={handleCopy}
							className={`flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-all active:scale-[0.97] cursor-pointer ${copied ? "animate-scale-in" : ""}`}
							type="button"
						>
							{copied ? (
								<>
									<svg
										width="14"
										height="14"
										viewBox="0 0 16 16"
										fill="none"
										aria-hidden="true"
									>
										<path
											d="M3 8.5L6.5 12L13 4"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
									Copied
								</>
						) : (
							<>
								<svg
									width="14"
									height="14"
									viewBox="0 0 16 16"
									fill="none"
									aria-hidden="true"
								>
									<rect
										x="5"
										y="5"
										width="8"
										height="8"
										rx="1.5"
										stroke="currentColor"
										strokeWidth="1.5"
									/>
									<path
										d="M3 11V3.5C3 3.22386 3.22386 3 3.5 3H11"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
									/>
								</svg>
								Share
							</>
						)}
					</button>
				</div>
				</div>
				<div>
					<p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						View (read-only live board)
					</p>
					<div className="flex gap-2">
						<div className="flex flex-1 items-center overflow-hidden rounded-lg bg-card ring-1 ring-border">
							<span className="truncate px-3 py-2.5 text-xs text-muted-foreground">
								{viewUrl}
							</span>
						</div>
						<button
							onClick={handleCopyView}
							className={`flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground transition-all active:scale-[0.97] cursor-pointer hover:bg-muted ${copiedView ? "animate-scale-in" : ""}`}
							type="button"
						>
							{copiedView ? (
								<>
									<svg
										width="14"
										height="14"
										viewBox="0 0 16 16"
										fill="none"
										aria-hidden="true"
									>
										<path
											d="M3 8.5L6.5 12L13 4"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
									Copied
								</>
							) : (
								<>
									<svg
										width="14"
										height="14"
										viewBox="0 0 16 16"
										fill="none"
										aria-hidden="true"
									>
										<rect
											x="5"
											y="5"
											width="8"
											height="8"
											rx="1.5"
											stroke="currentColor"
											strokeWidth="1.5"
										/>
										<path
											d="M3 11V3.5C3 3.22386 3.22386 3 3.5 3H11"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
										/>
									</svg>
									Copy
								</>
							)}
						</button>
					</div>
				</div>
			</div>

			{/* Max squares per person control */}
			<div className="mx-auto w-full max-w-lg px-4 pt-4">
				<div className="rounded-lg bg-card p-4 ring-1 ring-border">
					<div className="flex items-center justify-between pb-3">
						<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Squares per player
						</span>
						<span className="font-mono text-sm font-bold text-foreground">
							{maxSquaresPerPerson}
						</span>
					</div>
					<div className="grid grid-cols-4 gap-2">
						{SQUARES_OPTIONS.map((n) => (
							<button
								key={n}
								onClick={() => handleMaxChange(n)}
								disabled={n === maxSquaresPerPerson}
								className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
									n === maxSquaresPerPerson
										? "bg-primary text-primary-foreground"
										: "bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary"
								}`}
								type="button"
							>
								{n}
							</button>
						))}
					</div>
					{maxError && (
						<p className="mt-2 text-xs font-medium text-destructive">
							{maxError}
						</p>
					)}
				</div>
			</div>

			{/* Grid */}
			<div className="px-4 pt-4">
				<SquaresGrid
					pool={pool}
					interactive={false}
					winningSquares={winningSquares}
					currentScore={currentScore}
				/>
			</div>

			{/* Stats */}
			<div className="flex justify-center px-4 pt-4">
				<div className="flex w-full max-w-xs gap-3">
					<div className="flex flex-1 flex-col items-center rounded-lg bg-card p-3 ring-1 ring-border">
						<span className="font-mono text-lg font-bold text-foreground">
							{claimedCount}
						</span>
						<span className="text-[10px] font-medium text-muted-foreground">
							/ 100 claimed
						</span>
					</div>
					<div className="flex flex-1 flex-col items-center rounded-lg bg-card p-3 ring-1 ring-border">
						<span className="font-mono text-lg font-bold text-foreground">
							{allPlayerNames.length}
						</span>
						<span className="text-[10px] font-medium text-muted-foreground">
							players
						</span>
					</div>
				</div>
			</div>

			{/* Players list */}
			{allPlayerNames.length > 0 && (
				<div className="mx-auto w-full max-w-lg flex flex-col gap-2 px-4 pt-4">
					<h3 className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						Players
					</h3>
					<div className="flex flex-wrap justify-center gap-2">
						{allPlayerNames.map((name, idx) => {
							const player = pool.players[name];
							return (
								<div
									key={name}
									className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-border opacity-0 animate-fade-in-up"
									style={{ animationDelay: `${idx * 40}ms` }}
								>
									<GraphicIcon
										graphic={player.identity.graphic}
										className="text-sm leading-none [&_svg]:stroke-foreground"
										size={14}
									/>
									<span className="text-xs font-bold text-foreground">
										{name}
									</span>
									<span className="text-[10px] font-semibold text-muted-foreground">
										{player.count}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Actions */}
			<div className="mx-auto w-full max-w-lg flex flex-col gap-3 px-4 pt-6 pb-8">
				{/* Distribute remaining squares button (only if there are open squares and players) */}
				{openCount > 0 && allPlayerNames.length > 0 && (
					<button
						onClick={handleDistributeClick}
						disabled={isDistributing}
						className="w-full rounded-lg bg-muted px-6 py-3 text-sm font-semibold text-foreground ring-1 ring-border shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
						type="button"
					>
						{isDistributing
							? "Distributing..."
							: `Distribute ${openCount} Remaining Squares to Players`}
					</button>
				)}

				{/* Assign numbers button */}
				<button
					onClick={handleAssignClick}
					disabled={isAssigning || isDistributing}
					className="w-full rounded-lg bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
					type="button"
				>
					{isAssigning
						? "Assigning..."
						: numbersAssigned
							? "Re-assign Random Numbers"
							: "Assign Random Numbers"}
				</button>

				{numbersAssigned && (
					<p className="text-center text-xs text-muted-foreground">
						Numbers have been assigned. You can re-assign if needed.
					</p>
				)}
				{!numbersAssigned && claimedCount < 100 && (
					<p className="text-center text-balance text-xs text-muted-foreground">
						Share the link above so players can pick their squares. You can
						assign numbers at any time.
					</p>
				)}
			</div>

			{/* Confirmation dialog for assigning numbers when squares are open */}
			{showConfirmNumbers && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in">
					<div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg ring-1 ring-border animate-fade-in-up">
						<h3 className="text-base font-bold text-foreground">
							{openCount} squares are still open
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							Not all squares have been claimed yet. What would you like to do?
						</p>
						<div className="mt-5 flex flex-col gap-2">
							<button
								onClick={handleDistributeAndAssign}
								disabled={isDistributing || isAssigning}
								className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
								type="button"
							>
								{isDistributing || isAssigning
									? "Working..."
									: "Distribute Squares & Assign Numbers"}
							</button>
							<button
								onClick={handleAssignConfirmed}
								disabled={isAssigning}
								className="w-full rounded-lg bg-muted px-4 py-3 text-sm font-semibold text-foreground ring-1 ring-border transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
								type="button"
							>
								Assign Numbers Anyway
							</button>
							<button
								onClick={() => setShowConfirmNumbers(false)}
								className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground cursor-pointer"
								type="button"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Confirmation dialog for re-assigning numbers */}
			{showConfirmReassign && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in">
					<div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg ring-1 ring-border animate-fade-in-up">
						<h3 className="text-base font-bold text-foreground">
							Re-assign numbers?
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							This will replace the current row and column numbers with new
							random ones. Are you sure?
						</p>
						<div className="mt-5 flex flex-col gap-2">
							<button
								onClick={() => {
									setShowConfirmReassign(false);
									handleAssignConfirmed();
								}}
								disabled={isAssigning}
								className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
								type="button"
							>
								{isAssigning ? "Assigning..." : "Yes, Re-assign Numbers"}
							</button>
							<button
								onClick={() => setShowConfirmReassign(false)}
								className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground cursor-pointer"
								type="button"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Confirmation dialog for distributing remaining squares */}
			{showConfirmDistribute && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-fade-in">
					<div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg ring-1 ring-border animate-fade-in-up">
						<h3 className="text-base font-bold text-foreground">
							Distribute {openCount} squares?
						</h3>
						<p className="mt-2 text-sm text-muted-foreground">
							The remaining unclaimed squares will be randomly assigned to the{" "}
							{allPlayerNames.length} player
							{allPlayerNames.length === 1 ? "" : "s"}. This cannot be undone.
							Continue?
						</p>
						<div className="mt-5 flex flex-col gap-2">
							<button
								onClick={handleDistributeConfirmed}
								disabled={isDistributing}
								className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
								type="button"
							>
								{isDistributing ? "Distributing..." : "Yes, Distribute Squares"}
							</button>
							<button
								onClick={() => setShowConfirmDistribute(false)}
								className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground cursor-pointer"
								type="button"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function StatusBadge({
	status,
	numbersAssigned,
}: {
	status: string;
	numbersAssigned: boolean;
}) {
	let label: string;
	let className: string;

	if (numbersAssigned) {
		label = "Numbers Set";
		className = "bg-primary/15 text-primary";
	} else if (status === "open") {
		label = "Open";
		className = "bg-primary/15 text-primary";
	} else {
		label = "Locked";
		className = "bg-muted text-muted-foreground";
	}

	return (
		<span
			className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${className}`}
		>
			{label}
		</span>
	);
}
