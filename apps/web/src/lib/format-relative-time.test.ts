import { describe, expect, it } from "vitest";

import { formatRelativeTime } from "./format-relative-time";

const now = new Date("2026-06-15T12:00:00.000Z");
const ago = (milliseconds: number) => new Date(now.getTime() - milliseconds);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
	it.each([
		[ago(30 * SECOND), "agora"],
		[ago(5 * MINUTE), "há 5 minutos"],
		[ago(3 * HOUR), "há 3 horas"],
		[ago(DAY), "ontem"],
		[ago(4 * DAY), "há 4 dias"],
		[ago(61 * DAY), "há 2 meses"],
		[ago(800 * DAY), "há 2 anos"],
	])("formats %s as '%s' in pt-BR", (date, expected) => {
		expect(formatRelativeTime(date, now)).toBe(expected);
	});

	it("treats dates slightly in the future as now", () => {
		expect(formatRelativeTime(new Date(now.getTime() + 2 * SECOND), now)).toBe(
			"agora",
		);
	});
});
