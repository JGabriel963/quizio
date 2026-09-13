import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "db",
		environment: "node",
		include: ["src/**/*.test.ts"],
		// Pushing the schema into a fresh PGlite instance takes a few seconds.
		testTimeout: 30_000,
		hookTimeout: 30_000,
	},
});
