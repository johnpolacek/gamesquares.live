import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Normalize origin for email links: strip www. from host (e.g. www.gamesquares.live → gamesquares.live). */
export function originWithoutWww(origin: string): string {
	try {
		const u = new URL(origin);
		if (u.hostname.toLowerCase().startsWith("www.")) {
			u.hostname = u.hostname.slice(4);
			return u.origin;
		}
		return origin;
	} catch {
		return origin;
	}
}
