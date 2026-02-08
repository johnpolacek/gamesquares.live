import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Load .env.local so tests can read env vars like GLOBAL_ADMIN_SECRET
const envPath = resolve(__dirname, ".env.local");
try {
	const envFile = readFileSync(envPath, "utf-8");
	for (const line of envFile.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		const value = trimmed.slice(eqIdx + 1).trim();
		if (!(key in process.env)) {
			process.env[key] = value;
		}
	}
} catch {
	// .env.local may not exist in CI — tests fall back to defaults
}

/**
 * UI/E2E tests run against the Next.js app.
 *
 * Quick run: start the app in a separate terminal (`pnpm dev`), then run `pnpm test:e2e`.
 * With reuseExistingServer: true, Playwright will use that server. Alternatively,
 * Playwright can start the app via webServer (slower; ensure port 3000 is free).
 *
 * Requires Convex: set NEXT_PUBLIC_CONVEX_URL in .env.local for the "full flow" play test.
 * No RESEND_API_KEY or STRIPE_* required; email is mocked when key is missing.
 *
 * Tests run with one worker (serialized) so they don't contend for the same Convex DB:
 * pool creation limits, admin cookies, and server load are all safer.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: "html",
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "pnpm dev",
		url: "http://localhost:3000/api/ready",
		reuseExistingServer: true,
		timeout: 120_000,
		stdout: "ignore",
		stderr: "pipe",
	},
});
