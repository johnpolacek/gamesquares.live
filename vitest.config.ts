import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environmentMatchGlobs: [
			["convex/**", "edge-runtime"],
			["**", "node"],
		],
		server: {
			deps: {
				inline: ["convex-test"],
			},
		},
	},
});
