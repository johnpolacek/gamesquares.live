/**
 * Transform Convex database records into the Pool structure expected by UI components.
 */

import type { Id } from "@/convex/_generated/dataModel";
import type { PlayerIdentity, Pool, Square, PoolStatusClient } from "@/lib/types";

// Types matching Convex query results
export type ConvexPool = {
	_id: Id<"pools">;
	slug: string;
	title: string;
	adminEmail: string;
	status: "open" | "locked";
	maxSquaresPerPerson: number;
	createdAt: number;
	rowNumbers?: number[];
	colNumbers?: number[];
};

export type ConvexSquare = {
	_id: Id<"squares">;
	poolId: Id<"pools">;
	index: number;
	participantId?: Id<"participants">;
};

export type ConvexParticipant = {
	_id: Id<"participants">;
	poolId: Id<"pools">;
	displayName: string;
	createdAt: number;
};

// Default graphic and initials generator
const DEFAULT_GRAPHICS = [
	"🏈", "🦅", "🏆", "⭐", "🔥", "💎", "🎯", "🎲", "👑", "🍀",
	"⚡", "🌟", "🎪", "🏅", "🎰", "🃏", "🐻", "🦁", "🐯", "🦊",
];

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
	return name.trim().slice(0, 2).toUpperCase();
}

function getGraphicForParticipant(index: number): string {
	return DEFAULT_GRAPHICS[index % DEFAULT_GRAPHICS.length];
}

/**
 * Transform Convex data into the Pool structure for UI components.
 */
export function transformToPool(
	pool: ConvexPool,
	squares: ConvexSquare[],
	participants: ConvexParticipant[],
): Pool {
	// Create participant lookup map
	const participantMap = new Map<string, ConvexParticipant>();
	const participantIndexMap = new Map<string, number>();
	participants.forEach((p, idx) => {
		participantMap.set(p._id, p);
		participantIndexMap.set(p._id, idx);
	});

	// Build players record and identities
	const players: Record<string, { identity: PlayerIdentity; count: number }> = {};
	const participantIdentities = new Map<string, PlayerIdentity>();

	participants.forEach((p, idx) => {
		const identity: PlayerIdentity = {
			name: p.displayName,
			initials: getInitials(p.displayName),
			graphic: getGraphicForParticipant(idx),
		};
		participantIdentities.set(p._id, identity);
		players[p.displayName] = { identity, count: 0 };
	});

	// Build 10x10 squares grid
	const grid: Square[][] = Array.from({ length: 10 }, (_, row) =>
		Array.from({ length: 10 }, (_, col) => ({
			row,
			col,
			claimedBy: null,
		})),
	);

	// Fill in claimed squares
	for (const sq of squares) {
		const row = Math.floor(sq.index / 10);
		const col = sq.index % 10;

		if (sq.participantId) {
			const identity = participantIdentities.get(sq.participantId);
			if (identity) {
				grid[row][col].claimedBy = identity;
				players[identity.name].count += 1;
			}
		}
	}

	// Determine status
	const claimedCount = squares.filter((s) => s.participantId).length;
	let status: PoolStatusClient;
	if (pool.status === "locked") {
		status = "locked";
	} else if (claimedCount >= 100) {
		status = "full";
	} else {
		status = "open";
	}

	return {
		id: pool.slug,
		squaresPerPerson: pool.maxSquaresPerPerson,
		status,
		squares: grid,
		rowNumbers: pool.rowNumbers ?? Array(10).fill(null),
		colNumbers: pool.colNumbers ?? Array(10).fill(null),
		players,
	};
}
