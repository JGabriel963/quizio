import { configDefaults, defineProject } from "vitest/config";

export default defineProject({
	test: {
		name: "storage",
		environment: "node",
		include: ["src/**/*.test.ts"],
		exclude: [...configDefaults.exclude, "src/**/*.int.test.ts"],
	},
});
