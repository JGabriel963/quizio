import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "env",
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
});
