import { describe, expect, it } from "vitest";

import {
	OPEN_ASSIGNMENT_REFRESH_MS,
	reportListRefreshInterval,
	reportRefreshInterval,
} from "./report-refresh";

describe("report refresh (spec 030, RN-28)", () => {
	it("an open assignment's report asks again every 30 s", () => {
		expect(OPEN_ASSIGNMENT_REFRESH_MS).toBe(30_000);
		expect(
			reportRefreshInterval({ header: { assignment: { open: true } } }),
		).toBe(30_000);
		expect(
			reportRefreshInterval({ header: { assignment: { open: false } } }),
		).toBe(false);
		expect(reportRefreshInterval({ header: { assignment: null } })).toBe(false);
		expect(reportRefreshInterval(undefined)).toBe(false);
	});

	it("the list asks again while one of its lines is an open assignment", () => {
		expect(
			reportListRefreshInterval({ items: [{ open: false }, { open: true }] }),
		).toBe(30_000);
		expect(reportListRefreshInterval({ items: [{ open: false }] })).toBe(false);
		expect(reportListRefreshInterval(undefined)).toBe(false);
	});
});
