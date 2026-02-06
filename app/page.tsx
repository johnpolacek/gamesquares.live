"use client";

import { useCallback, useState } from "react";
import { AdminBoard } from "@/components/admin-board";
import { LandingHero } from "@/components/landing-hero";
import { PlayerBoard } from "@/components/player-board";
import type { PlayerIdentity, Pool } from "@/lib/pool-store";
import { isBoardFull } from "@/lib/pool-store";

type AppView = "landing" | "admin" | "player";

export default function Home() {
	const [view, setView] = useState<AppView>("landing");
	const [pool, setPool] = useState<Pool | null>(null);

	const handleClaimSquare = useCallback(
		(identity: PlayerIdentity, row: number, col: number) => {
			if (!pool) return;

			setPool((prev) => {
				if (!prev) return prev;
				const square = prev.squares[row][col];
				if (square.claimedBy !== null) return prev;

				const currentCount = prev.squares
					.flat()
					.filter((s) => s.claimedBy?.name === identity.name).length;
				if (currentCount >= prev.squaresPerPerson) return prev;

				const newSquares = prev.squares.map((r) =>
					r.map((s) => {
						if (s.row === row && s.col === col) {
							return { ...s, claimedBy: identity };
						}
						return s;
					}),
				);

				const newPlayers = { ...prev.players };
				if (!newPlayers[identity.name]) {
					newPlayers[identity.name] = { identity, count: 0 };
				}
				newPlayers[identity.name] = {
					...newPlayers[identity.name],
					count: newPlayers[identity.name].count + 1,
				};

				const updated: Pool = {
					...prev,
					squares: newSquares,
					players: newPlayers,
				};

				if (isBoardFull(updated)) {
					updated.status = "full";
				}

				return updated;
			});
		},
		[pool],
	);

	const handleAssignNumbers = useCallback(() => {
		if (!pool) return;

		const shuffle = () => {
			const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
			for (let i = nums.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[nums[i], nums[j]] = [nums[j], nums[i]];
			}
			return nums;
		};

		setPool((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				rowNumbers: shuffle(),
				colNumbers: shuffle(),
				status: "locked" as const,
			};
		});
	}, [pool]);

	if (view === "landing" || !pool) {
		return <LandingHero />;
	}

	const shareUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/pool/${pool.id}`
			: `/pool/${pool.id}`;

	if (view === "admin") {
		return (
			<>
				<AdminBoard
					pool={pool}
					shareUrl={shareUrl}
					onLockBoard={() => {}}
					onAssignNumbers={handleAssignNumbers}
				/>
				<div className="fixed bottom-4 right-4 z-50">
					<button
						onClick={() => setView("player")}
						className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-lg transition-all active:scale-95"
						type="button"
					>
						Switch to Player View
					</button>
				</div>
			</>
		);
	}

	return (
		<>
			<PlayerBoard pool={pool} onClaimSquare={handleClaimSquare} />
			<div className="fixed bottom-4 right-4 z-50">
				<button
					onClick={() => setView("admin")}
					className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background shadow-lg transition-all active:scale-95"
					type="button"
				>
					Switch to Admin View
				</button>
			</div>
		</>
	);
}
