import react from "@vitejs/plugin-react";
import { defineProject } from "vitest/config";

// Separate from vite.config.ts: the TanStack Start plugin builds the SSR app and
// is not needed (or wanted) for component tests.
export default defineProject({
	plugins: [react()],
	resolve: { tsconfigPaths: true },
	test: {
		name: "web",
		environment: "jsdom",
		include: ["src/**/*.test.{ts,tsx}"],
		setupFiles: ["./src/testing/setup.ts"],
	},
});
