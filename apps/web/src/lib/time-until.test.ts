import { describe, expect, it } from "vitest";

import { openFor, timeUntil } from "./time-until";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("time until a deadline (spec 029, RN-10)", () => {
	it("rounds to the nearest day, hour or minute", () => {
		expect(timeUntil(2 * DAY + 22 * HOUR)).toBe("em 3 dias");
		expect(timeUntil(2 * DAY + 2 * HOUR)).toBe("em 2 dias");
		expect(timeUntil(5 * HOUR)).toBe("em 5 horas");
		expect(timeUntil(5 * HOUR + 40 * MINUTE)).toBe("em 6 horas");
		expect(timeUntil(40 * MINUTE)).toBe("em 40 minutos");
	});

	it("singular forms", () => {
		expect(timeUntil(DAY + 3 * HOUR)).toBe("em 1 dia");
		expect(timeUntil(HOUR + 10 * MINUTE)).toBe("em 1 hora");
		expect(timeUntil(MINUTE)).toBe("em 1 minuto");
	});

	it("never says less than a minute", () => {
		expect(timeUntil(10_000)).toBe("em 1 minuto");
		expect(timeUntil(0)).toBe("em 1 minuto");
	});

	it("openFor says Aberto por", () => {
		expect(openFor(2 * DAY)).toBe("Aberto por 2 dias");
		expect(openFor(HOUR)).toBe("Aberto por 1 hora");
	});
});
