import { defineConfig } from "vitest/config";

// Root entry for `pnpm test:watch` and editor integrations. CI and `pnpm test`
// go through Turborepo, which runs each package's own config.
export default defineConfig({
	test: {
		projects: ["packages/*/vitest.config.ts", "apps/*/vitest.config.ts"],
	},
});
