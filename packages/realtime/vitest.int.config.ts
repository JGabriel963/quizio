import { defineProject } from "vitest/config";

// Integration tests talk to the Soketi container from `pnpm infra:up`.
export default defineProject({
	test: {
		name: "realtime:int",
		environment: "node",
		include: ["src/**/*.int.test.ts"],
		testTimeout: 20_000,
	},
});
