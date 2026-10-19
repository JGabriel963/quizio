import { describe, expect, it } from "vitest";

import {
	deadlineBounds,
	defaultDeadline,
	formatDeadlineLong,
	hourOptions,
	isDayAllowed,
	withHour,
} from "./assignment-deadline";

// Local times: the tests read them in the machine's zone, as the dialog does.
const now = new Date(2026, 9, 19, 14, 11);

describe("assignment deadline (spec 029)", () => {
	it("the default deadline is three days ahead at noon", () => {
		expect(defaultDeadline(now)).toEqual(new Date(2026, 9, 22, 12, 0));
	});

	it("bounds go from now to the maximum days", () => {
		expect(deadlineBounds(now, 28)).toEqual({
			min: now,
			max: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
		});
	});

	it("a day is allowed when one of its hours fits the bounds", () => {
		const bounds = deadlineBounds(now, 28);

		expect(isDayAllowed(new Date(2026, 9, 18), bounds)).toBe(false);
		expect(isDayAllowed(new Date(2026, 9, 19), bounds)).toBe(true);
		expect(isDayAllowed(new Date(2026, 10, 16), bounds)).toBe(true);
		expect(isDayAllowed(new Date(2026, 10, 17), bounds)).toBe(false);
	});

	it("today offers only the full hours still ahead", () => {
		const bounds = deadlineBounds(now, 28);

		expect(hourOptions(new Date(2026, 9, 19), bounds)).toEqual([
			15, 16, 17, 18, 19, 20, 21, 22, 23,
		]);
		expect(hourOptions(new Date(2026, 9, 20), bounds)).toHaveLength(24);
	});

	it("the last day offers only the hours up to the maximum", () => {
		const bounds = deadlineBounds(now, 28);

		expect(hourOptions(new Date(2026, 10, 16), bounds)).toEqual([
			0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
		]);
	});

	it("withHour sets the hour of a day, at minute zero", () => {
		expect(withHour(new Date(2026, 9, 30, 9, 45), 18)).toEqual(
			new Date(2026, 9, 30, 18, 0),
		);
	});

	it("formats the long date", () => {
		expect(formatDeadlineLong(new Date(2026, 9, 22, 12, 0))).toBe(
			"quinta-feira, 22 de outubro de 2026 às 12:00",
		);
	});
});
