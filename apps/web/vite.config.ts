import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 3001,
	},
	resolve: {
		tsconfigPaths: true,
	},
	// Nitro picks the output from where it builds: Vercel functions on Vercel,
	// a Node server (`.output/server/index.mjs`) anywhere else.
	plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
});
