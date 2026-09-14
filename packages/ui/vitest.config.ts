import react from "@vitejs/plugin-react";
import { defineProject } from "vitest/config";

export default defineProject({
	plugins: [react()],
	resolve: { tsconfigPaths: true },
	test: {
		name: "ui",
		environment: "jsdom",
		include: ["src/**/*.test.{ts,tsx}"],
		setupFiles: ["./src/testing/setup.ts"],
	},
});
