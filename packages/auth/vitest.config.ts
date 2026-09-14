import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "auth",
		environment: "node",
		include: ["src/**/*.test.ts"],
		// Each file pushes the schema into a fresh PGlite instance.
		testTimeout: 30_000,
		hookTimeout: 30_000,
	},
});
