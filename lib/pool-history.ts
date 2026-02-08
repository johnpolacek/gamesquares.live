const STORAGE_KEY = "gamesquares_pools";
const MAX_ENTRIES = 20;

export type PoolHistoryEntry = {
	slug: string;
	title: string;
	role: "admin" | "player";
	joinedAt: number;
	/** Set when admin role was verified via email magic link */
	verifiedAt?: number;
};

/**
 * Get the pool history from localStorage, sorted by most recent first.
 */
export function getPoolHistory(): PoolHistoryEntry[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter(
				(e: unknown): e is PoolHistoryEntry =>
					typeof e === "object" &&
					e !== null &&
					typeof (e as PoolHistoryEntry).slug === "string" &&
					typeof (e as PoolHistoryEntry).title === "string" &&
					((e as PoolHistoryEntry).role === "admin" ||
						(e as PoolHistoryEntry).role === "player") &&
					typeof (e as PoolHistoryEntry).joinedAt === "number",
			)
			.sort((a, b) => b.joinedAt - a.joinedAt);
	} catch {
		return [];
	}
}

/**
 * Get only verified pool entries: players (always trusted) and
 * admin entries that have been confirmed via email verification.
 * Admin entries without verifiedAt are stale (created before the
 * email-verification flow) and are excluded.
 */
export function getVerifiedPoolHistory(): PoolHistoryEntry[] {
	return getPoolHistory().filter(
		(e) => e.role === "player" || (e.role === "admin" && e.verifiedAt),
	);
}

/**
 * Add a pool entry to the history.
 * If the same slug+role already exists, update it (bump timestamp and title).
 * If the slug exists with a different role, keep both (admin + player).
 * Caps at MAX_ENTRIES, dropping the oldest.
 */
export function addPoolToHistory(entry: PoolHistoryEntry): void {
	if (typeof window === "undefined") return;
	try {
		const history = getPoolHistory();
		const existingIndex = history.findIndex(
			(e) => e.slug === entry.slug && e.role === entry.role,
		);
		if (existingIndex !== -1) {
			history[existingIndex] = { ...entry };
		} else {
			history.unshift(entry);
		}
		const sorted = history
			.sort((a, b) => b.joinedAt - a.joinedAt)
			.slice(0, MAX_ENTRIES);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
	} catch {
		// localStorage full or unavailable — silently ignore
	}
}

/**
 * Remove a pool entry from the history by slug and role.
 */
export function removePoolFromHistory(
	slug: string,
	role: "admin" | "player",
): void {
	if (typeof window === "undefined") return;
	try {
		const history = getPoolHistory();
		const filtered = history.filter(
			(e) => !(e.slug === slug && e.role === role),
		);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
	} catch {
		// silently ignore
	}
}
