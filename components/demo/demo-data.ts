import type { PlayerIdentity, Pool, Square } from "@/lib/pool-store";
import type { WinningSquare } from "@/components/squares-grid";

// ── Player roster ───────────────────────────────────────────────────────
export const DEMO_PLAYERS: PlayerIdentity[] = [
	{ name: "Mike M.", initials: "MM", graphic: "🏈" },
	{ name: "Sarah K.", initials: "SK", graphic: "🦅" },
	{ name: "Dad", initials: "DA", graphic: "🏆" },
	{ name: "Uncle Joe", initials: "UJ", graphic: "⭐" },
	{ name: "Emily R.", initials: "ER", graphic: "🔥" },
	{ name: "Tyler B.", initials: "TB", graphic: "💎" },
	{ name: "Grandma", initials: "GR", graphic: "🍀" },
	{ name: "Chris P.", initials: "CP", graphic: "⚡" },
	{ name: "Jen W.", initials: "JW", graphic: "🌟" },
	{ name: "Rob T.", initials: "RT", graphic: "👑" },
];

// ── Deterministic shuffle (seeded) for reproducibility ──────────────────
function seededShuffle<T>(arr: T[], seed: number): T[] {
	const out = [...arr];
	let s = seed;
	for (let i = out.length - 1; i > 0; i--) {
		s = (s * 16807 + 0) % 2147483647;
		const j = s % (i + 1);
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

// ── Build a fully-claimed 10x10 grid ────────────────────────────────────
function buildClaimedGrid(): Square[][] {
	// 10 players x 10 squares each = 100
	const assignments = seededShuffle(
		DEMO_PLAYERS.flatMap((p) => Array(10).fill(p) as PlayerIdentity[]),
		42,
	);
	let idx = 0;
	return Array.from({ length: 10 }, (_, row) =>
		Array.from({ length: 10 }, (_, col) => ({
			row,
			col,
			claimedBy: assignments[idx++],
		})),
	);
}

// Row/col number assignments (shuffled 0-9)
export const DEMO_ROW_NUMBERS = [3, 7, 1, 9, 0, 5, 8, 2, 6, 4];
export const DEMO_COL_NUMBERS = [6, 2, 8, 0, 4, 9, 1, 5, 3, 7];

// ── Players record for Pool type ────────────────────────────────────────
function buildPlayersRecord(): Record<
	string,
	{ identity: PlayerIdentity; count: number }
> {
	const rec: Record<string, { identity: PlayerIdentity; count: number }> = {};
	for (const p of DEMO_PLAYERS) {
		rec[p.name] = { identity: p, count: 10 };
	}
	return rec;
}

// ── Partially claimed grid (for the "picking" scene) ────────────────────
export function buildPartialGrid(claimedCount: number): Square[][] {
	const full = buildClaimedGrid();
	let remaining = claimedCount;
	return full.map((row) =>
		row.map((sq) => {
			if (remaining > 0) {
				remaining--;
				return sq;
			}
			return { ...sq, claimedBy: null };
		}),
	);
}

// ── Empty grid (for create/share scenes) ────────────────────────────────
export function buildEmptyGrid(): Square[][] {
	return Array.from({ length: 10 }, (_, row) =>
		Array.from({ length: 10 }, (_, col) => ({
			row,
			col,
			claimedBy: null,
		})),
	);
}

// ── Full pool with all squares claimed ──────────────────────────────────
export const DEMO_POOL_FULL: Pool = {
	id: "DEMO01",
	squaresPerPerson: 10,
	status: "locked",
	squares: buildClaimedGrid(),
	rowNumbers: DEMO_ROW_NUMBERS,
	colNumbers: DEMO_COL_NUMBERS,
	players: buildPlayersRecord(),
};

// ── Pool at various stages ──────────────────────────────────────────────
export const DEMO_POOL_EMPTY: Pool = {
	id: "DEMO01",
	squaresPerPerson: 10,
	status: "open",
	squares: buildEmptyGrid(),
	rowNumbers: Array(10).fill(null),
	colNumbers: Array(10).fill(null),
	players: {},
};

export const DEMO_POOL_NO_NUMBERS: Pool = {
	...DEMO_POOL_FULL,
	status: "open",
	rowNumbers: Array(10).fill(null),
	colNumbers: Array(10).fill(null),
};

// ── Quarter scores ──────────────────────────────────────────────────────
export const DEMO_QUARTERS = [
	{ label: "Q1", eaglesScore: 7, patriotsScore: 3 },
	{ label: "Q2", eaglesScore: 14, patriotsScore: 10 },
	{ label: "Q3", eaglesScore: 21, patriotsScore: 17 },
	{ label: "Q4", eaglesScore: 28, patriotsScore: 24 },
];

// Winning square for each quarter = last digit of (eaglesScore, patriotsScore)
// mapped through row/col number arrays
function getWinningSquare(
	eaglesScore: number,
	patriotsScore: number,
	label: string,
): WinningSquare {
	return {
		quarterLabel: label,
		row: eaglesScore % 10,
		col: patriotsScore % 10,
	};
}

export const DEMO_WINNING_SQUARES: WinningSquare[] = DEMO_QUARTERS.map((q) =>
	getWinningSquare(q.eaglesScore, q.patriotsScore, q.label),
);

// Just Q1 winner
export const DEMO_Q1_WINNING = [DEMO_WINNING_SQUARES[0]];

// Q1 current score digits
export const DEMO_Q1_SCORE = {
	rowDigit: DEMO_QUARTERS[0].eaglesScore % 10,
	colDigit: DEMO_QUARTERS[0].patriotsScore % 10,
};

// Final score digits
export const DEMO_FINAL_SCORE = {
	rowDigit: DEMO_QUARTERS[3].eaglesScore % 10,
	colDigit: DEMO_QUARTERS[3].patriotsScore % 10,
};

// ── Scene metadata ──────────────────────────────────────────────────────
export const SCENE_META = [
	{ id: "create", label: "Create", title: "Create Your Pool" },
	{ id: "share", label: "Share", title: "Share the Link" },
	{ id: "join", label: "Join", title: "Players Join" },
	{ id: "pick", label: "Pick", title: "Pick Your Squares" },
	{ id: "start", label: "Start", title: "Game Time" },
	{ id: "q1", label: "Q1", title: "First Score!" },
	{ id: "final", label: "Final", title: "The Final" },
] as const;

// ── Helper: find winner name for a quarter ──────────────────────────────
export function getWinnerName(
	pool: Pool,
	eaglesScore: number,
	patriotsScore: number,
): string {
	const rowDigit = eaglesScore % 10;
	const colDigit = patriotsScore % 10;
	const rowIdx = pool.rowNumbers.indexOf(rowDigit);
	const colIdx = pool.colNumbers.indexOf(colDigit);
	if (rowIdx >= 0 && colIdx >= 0) {
		const sq = pool.squares[rowIdx]?.[colIdx];
		if (sq?.claimedBy) return sq.claimedBy.name;
	}
	return "—";
}
