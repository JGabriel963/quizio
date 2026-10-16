import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3001";

// E2E runs against the real dev server and local infra (`pnpm infra:up`).
// Live-game specs will open one browser context per participant (host + players).
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// Every worker drives browsers against the one dev server, which serves each
	// module on its own: past two workers pages take longer to load than the
	// tests wait, and the suite gets no faster.
	workers: 2,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL,
		trace: "on-first-retry",
	},
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"] } },
		// Players join from phones; keep a mobile viewport in every run.
		{ name: "mobile", use: { ...devices["Pixel 7"] } },
	],
	webServer: {
		command: "pnpm dev",
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		// Turns off Vite's error overlay (see vite.config.ts).
		env: { E2E: "1" },
	},
});
