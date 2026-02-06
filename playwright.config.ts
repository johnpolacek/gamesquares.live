import { defineConfig, devices } from "@playwright/test";

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
