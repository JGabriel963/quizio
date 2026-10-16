import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
	server: {
		port: 3001,
		// Playwright runs many pages against one dev server: a request aborted by a
		// closing page is a server error, and the overlay it broadcasts to every
		// open tab would block clicks in unrelated tests. Normal `pnpm dev` keeps it.
		hmr: { overlay: !process.env.E2E },
	},
	resolve: {
		tsconfigPaths: true,
	},
	ssr: {
		// The server output runs with no node_modules next to it (a Vercel
		// function), so nothing may stay external: a CommonJS dependency inlined
		// by the build would otherwise keep a runtime `require("react")`.
		noExternal: command === "build" ? true : undefined,
	},
	// Nitro picks the output from where it builds: Vercel functions on Vercel,
	// a Node server (`.output/server/index.mjs`) anywhere else.
	plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
}));
