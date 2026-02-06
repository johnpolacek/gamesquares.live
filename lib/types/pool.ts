/**
 * Shared pool types for client and Convex.
 * Convex schema uses PoolStatus = "open" | "locked".
 */

export type PlayerIdentity = {
	name: string;
	initials: string;
	graphic: string;
};

export type Square = {
	row: number;
	col: number;
	claimedBy: PlayerIdentity | null;
};

/** Backend (Convex) pool status. */
export type PoolStatus = "open" | "locked";

/** Extended status for client UI (setup, full before lock). */
export type PoolStatusClient = "setup" | "open" | "full" | "locked";

export type Pool = {
	id: string;
	squaresPerPerson: number;
	status: PoolStatusClient;
	squares: Square[][];
	rowNumbers: (number | null)[];
	colNumbers: (number | null)[];
	players: Record<string, { identity: PlayerIdentity; count: number }>;
};

/** Route path prefixes. */
export const ROUTES = {
	/** Public pool page: /play/{slug} */
	PLAY_PREFIX: "/play/",
	/** Admin magic link: /go/?token=... */
	ADMIN_LOGIN_PREFIX: "/go/",
} as const;
