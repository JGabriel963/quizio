import { describe, expect, it } from "vitest";

import { agentNameOf, isConnectionIdle } from "./agent-connection";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("agentNameOf (spec 044, RN-04)", () => {
	it("agentNameOf uses the registered name, or the return address's domain", () => {
		expect(
			agentNameOf("  Claude Code ", "http://localhost:3118/callback"),
		).toBe("Claude Code");
		expect(agentNameOf(null, "https://chatgpt.com/connector/oauth/abc")).toBe(
			"chatgpt.com",
		);
		expect(agentNameOf("   ", "https://claude.ai/api/mcp/auth_callback")).toBe(
			"claude.ai",
		);
	});

	it("has no name without either", () => {
		expect(agentNameOf(null, null)).toBeNull();
		expect(agentNameOf(null, "not a url")).toBeNull();
	});
});

describe("isConnectionIdle (spec 044, RN-18)", () => {
	const now = new Date("2026-10-28T12:00:00.000Z");
	const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);

	it("a connection is idle after 90 days without use, counting from connecting when never used", () => {
		expect(
			isConnectionIdle(
				{ connectedAt: daysAgo(200), lastUsedAt: daysAgo(91) },
				now,
				90,
			),
		).toBe(true);
		expect(
			isConnectionIdle(
				{ connectedAt: daysAgo(200), lastUsedAt: daysAgo(89) },
				now,
				90,
			),
		).toBe(false);
		expect(
			isConnectionIdle({ connectedAt: daysAgo(91), lastUsedAt: null }, now, 90),
		).toBe(true);
		expect(
			isConnectionIdle({ connectedAt: daysAgo(90), lastUsedAt: null }, now, 90),
		).toBe(false);
	});
});
