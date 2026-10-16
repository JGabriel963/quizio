import { config } from "dotenv";
import { defineProject } from "vitest/config";

// The same variables as the app, from its .env (apps/web/.env).
config({ path: "../../apps/web/.env", quiet: true });

// Talks to the real provider: runs only with AI_PROVIDER, AI_MODEL and AI_API_KEY set.
export default defineProject({
	test: {
		name: "ai:int",
		environment: "node",
		include: ["src/**/*.int.test.ts"],
		testTimeout: 180_000,
	},
});
