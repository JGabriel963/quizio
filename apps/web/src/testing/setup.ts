import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach } from "vitest";

// jsdom draws nothing: every animation goes straight to its end (spec 011).
MotionGlobalConfig.skipAnimations = true;

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(() => {
	cleanup();
});
