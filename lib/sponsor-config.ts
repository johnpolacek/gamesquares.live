/**
 * Shared sponsor configuration.
 *
 * SPONSOR_POOLS_COUNT:  Number of bonus pool slots unlocked per sponsor purchase.
 * The env var SPONSOR_POOLS_COUNT overrides the default at runtime.
 */

const envCount =
	typeof process !== "undefined" ? Number(process.env?.SPONSOR_POOLS_COUNT) : undefined;

/** Number of pool slots each sponsor purchase unlocks. */
export const SPONSOR_POOLS_COUNT: number =
	envCount && Number.isFinite(envCount) && envCount > 0 ? envCount : 10;
