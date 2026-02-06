import type { Pool, Square } from "@/lib/types";

export type { PlayerIdentity, Pool, Square } from "@/lib/types";

export function createEmptyGrid(): Square[][] {
	return Array.from({ length: 10 }, (_, row) =>
		Array.from({ length: 10 }, (_, col) => ({
			row,
			col,
			claimedBy: null,
		})),
	);
}

export function createPool(id: string, squaresPerPerson: number): Pool {
	return {
		id,
		squaresPerPerson,
		status: "open",
		squares: createEmptyGrid(),
		rowNumbers: Array(10).fill(null),
		colNumbers: Array(10).fill(null),
		players: {},
	};
}

export function getClaimedCount(pool: Pool): number {
	return pool.squares.flat().filter((s) => s.claimedBy !== null).length;
}

export function getPlayerSquareCount(pool: Pool, playerName: string): number {
	return pool.squares.flat().filter((s) => s.claimedBy?.name === playerName)
		.length;
}

export function isBoardFull(pool: Pool): boolean {
	return getClaimedCount(pool) >= 100;
}

export function generatePoolId(): string {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PLAYER_COLORS = [
	"oklch(0.65 0.18 30)",
	"oklch(0.60 0.16 60)",
	"oklch(0.55 0.18 140)",
	"oklch(0.55 0.16 200)",
	"oklch(0.55 0.18 260)",
	"oklch(0.60 0.14 320)",
	"oklch(0.65 0.14 80)",
	"oklch(0.50 0.16 180)",
	"oklch(0.60 0.12 350)",
	"oklch(0.55 0.14 110)",
];

export function getPlayerColor(
	playerName: string,
	allPlayers: string[],
): string {
	const index = allPlayers.indexOf(playerName);
	return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export const AVAILABLE_GRAPHICS = [
	"🏈",
	"🦅",
	"🏆",
	"⭐",
	"🔥",
	"💎",
	"🎯",
	"🎲",
	"👑",
	"🍀",
	"⚡",
	"🌟",
	"🎪",
	"🏅",
	"🎰",
	"🃏",
	"🐻",
	"🦁",
	"🐯",
	"🦊",
];

export function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
	return name.trim().slice(0, 2).toUpperCase();
}
