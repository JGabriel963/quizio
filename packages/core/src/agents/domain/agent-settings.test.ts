import { describe, expect, it } from "vitest";

import { AGENT_REQUEST_WINDOW_MS, retryAfterSeconds } from "./agent-settings";

describe("retryAfterSeconds (spec 044, RN-33)", () => {
	it("retryAfterSeconds counts to the end of the fixed window", () => {
		expect(
			retryAfterSeconds(
				new Date("2026-10-28T12:00:15.000Z"),
				AGENT_REQUEST_WINDOW_MS,
			),
		).toBe(45);
		expect(
			retryAfterSeconds(
				new Date("2026-10-28T12:00:59.200Z"),
				AGENT_REQUEST_WINDOW_MS,
			),
		).toBe(1);
	});

	it("is never less than one second", () => {
		expect(
			retryAfterSeconds(
				new Date("2026-10-28T12:00:59.999Z"),
				AGENT_REQUEST_WINDOW_MS,
			),
		).toBe(1);
	});
});
