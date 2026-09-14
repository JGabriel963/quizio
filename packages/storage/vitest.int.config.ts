import { defineProject } from "vitest/config";

// Integration tests talk to the RustFS container from `pnpm infra:up`.
export default defineProject({
	test: {
		name: "storage:int",
		environment: "node",
		include: ["src/**/*.int.test.ts"],
		testTimeout: 20_000,
	},
});
