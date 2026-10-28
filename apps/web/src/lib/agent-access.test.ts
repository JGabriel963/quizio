import { describe, expect, it } from "vitest";

import { hasConnectedAgent } from "./agent-access";

const connection = {
	id: "consent-1",
	agentName: "Claude Code",
	connectedAt: "2026-10-20T12:00:00.000Z",
	lastUsedAt: null,
};
const key = (lastUsedAt: string | null) => ({
	id: "k1",
	name: "Script",
	start: "qz_abc123",
	createdAt: "2026-10-20T12:00:00.000Z",
	lastUsedAt,
});

describe("hasConnectedAgent (spec 044)", () => {
	it("an authorized agent counts", () => {
		expect(hasConnectedAgent({ connections: [connection], keys: [] })).toBe(
			true,
		);
	});

	it("a key counts once an agent used it", () => {
		expect(hasConnectedAgent({ connections: [], keys: [key(null)] })).toBe(
			false,
		);
		expect(
			hasConnectedAgent({
				connections: [],
				keys: [key("2026-10-28T09:00:00.000Z")],
			}),
		).toBe(true);
	});

	it("nothing yet", () => {
		expect(hasConnectedAgent({ connections: [], keys: [] })).toBe(false);
	});
});
