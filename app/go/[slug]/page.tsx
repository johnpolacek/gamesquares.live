"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AdminBoard } from "@/components/admin-board";
import { transformToPool } from "@/lib/convex-to-pool";
import { useEffect, useState } from "react";
import { ROUTES } from "@/lib/types";

export default function AdminPage() {
	const params = useParams<{ slug: string }>();
	const router = useRouter();
	const slug = params.slug;

	const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

	// Check admin auth via API (works with HttpOnly cookie)
	useEffect(() => {
		if (!slug) return;

		let cancelled = false;
		fetch(`/api/auth/check-admin?slug=${encodeURIComponent(slug)}`, {
			credentials: "include",
		})
			.then((res) => res.json())
			.then((data) => {
				if (cancelled) return;
				if (data.ok) {
					setIsAuthorized(true);
				} else {
					router.replace("/");
				}
			})
			.catch(() => {
				if (!cancelled) router.replace("/");
			});

		return () => {
			cancelled = true;
		};
	}, [slug, router]);

	// Fetch pool data and global game
	const poolData = useQuery(api.pools.getPoolBySlug, { slug });
	const gameData = useQuery(api.games.getCurrentGame, {});

	// Mutations
	const updateMaxSquaresMutation = useMutation(api.pools.updateMaxSquares);
	const assignNumbersMutation = useMutation(api.pools.assignNumbers);
	const distributeSquaresMutation = useMutation(api.squares.distributeSquares);

	// Loading state
	if (isAuthorized === null || poolData === undefined) {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 bg-background">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</main>
		);
	}

	// Pool not found
	if (!poolData.found) {
		return (
			<main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 bg-background">
				<div className="flex flex-col items-center gap-6 text-center max-w-md">
					<h1 className="text-2xl font-bold">Pool Not Found</h1>
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

	// Transform to Pool type for components
	const pool = transformToPool(poolData.pool, poolData.squares, poolData.participants);

	// Global game: winning square per quarter (score digits, mapped to grid in SquaresGrid)
	const winningSquares =
		gameData?.found === true
			? gameData.game.quarters.map((q) => ({
					quarterLabel: q.label,
					row: q.rowTeamScore % 10,
					col: q.colTeamScore % 10,
				}))
			: [];

	// Current score highlight
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

	// Generate share URL
	const shareUrl =
		typeof window !== "undefined"
			? `${window.location.origin}${ROUTES.PLAY_PREFIX}${slug}`
			: `${ROUTES.PLAY_PREFIX}${slug}`;

	const handleUpdateMaxSquares = async (newMax: number) => {
		const result = await updateMaxSquaresMutation({
			poolId: poolData.pool._id,
			maxSquaresPerPerson: newMax,
		});
		return result;
	};

	const handleAssignNumbers = async () => {
		await assignNumbersMutation({
			poolId: poolData.pool._id,
		});
	};

	const handleDistributeSquares = async () => {
		return await distributeSquaresMutation({
			poolId: poolData.pool._id,
		});
	};

	return (
		<AdminBoard
			pool={pool}
			shareUrl={shareUrl}
			maxSquaresPerPerson={poolData.pool.maxSquaresPerPerson}
			onUpdateMaxSquares={handleUpdateMaxSquares}
			onAssignNumbers={handleAssignNumbers}
			onDistributeSquares={handleDistributeSquares}
			winningSquares={winningSquares}
			game={gameData?.found ? gameData.game : null}
			currentScore={currentScore}
		/>
	);
}
