import { describe, expect, it } from "vitest";

import type { ScoreboardEntryData } from "./api-types";
import { scoreboardSteps } from "./scoreboard-animation";

const entry = (
	nickname: string,
	rank: number,
	total: number,
	previous: { rank: number; total: number } | null,
): ScoreboardEntryData => ({
	playerId: nickname.toLowerCase(),
	nickname,
	rank,
	total,
	climbed: previous !== null && rank < previous.rank,
	previous,
});

const shown = (
	rows: { nickname: string; fromTotal: number; total: number }[],
) => rows.map((row) => [row.nickname, row.fromTotal, row.total]);

describe("scoreboardSteps (spec 011, RN-28 to RN-32)", () => {
	it("a player who keeps the place only has the points going up", () => {
		const steps = scoreboardSteps(
			[
				entry("Ana", 1, 1340, { rank: 1, total: 639 }),
				entry("Bia", 2, 500, { rank: 2, total: 500 }),
			],
			[],
		);

		expect(steps.changed).toBe(true);
		expect(steps.counts).toBe(true);
		expect(shown(steps.before)).toEqual([
			["Ana", 639, 1340],
			["Bia", 500, 500],
		]);
		expect(shown(steps.after)).toEqual(shown(steps.before));
	});

	it("starts in the order of before the question and ends in the new one", () => {
		const steps = scoreboardSteps(
			[
				entry("Bia", 1, 701, { rank: 2, total: 0 }),
				entry("Ana", 2, 639, { rank: 1, total: 639 }),
			],
			[],
		);

		expect(steps.before.map((row) => row.nickname)).toEqual(["Ana", "Bia"]);
		expect(steps.after.map((row) => row.nickname)).toEqual(["Bia", "Ana"]);
		// The arrow comes with the row arriving, not before.
		expect(steps.before.every((row) => !row.climbed)).toBe(true);
		expect(steps.after.map((row) => row.climbed)).toEqual([true, false]);
	});

	it("starts without who comes into the five, and with who leaves", () => {
		const steps = scoreboardSteps(
			[
				entry("Ana", 1, 700, { rank: 1, total: 700 }),
				entry("Bia", 2, 600, { rank: 2, total: 600 }),
				entry("Caio", 3, 500, { rank: 3, total: 500 }),
				entry("Gil", 4, 450, { rank: 6, total: 100 }),
				entry("Duda", 5, 400, { rank: 4, total: 400 }),
			],
			[entry("Eva", 6, 300, { rank: 5, total: 300 })],
		);

		expect(steps.before.map((row) => row.nickname)).toEqual([
			"Ana",
			"Bia",
			"Caio",
			"Duda",
			"Eva",
		]);
		expect(steps.after.map((row) => row.nickname)).toEqual([
			"Ana",
			"Bia",
			"Caio",
			"Gil",
			"Duda",
		]);
		// Gil's points go up as the row comes in.
		expect(steps.after[3]).toMatchObject({ fromTotal: 100, total: 450 });
		// Nobody on screen scored: the rows move without a count to wait for.
		expect(steps.counts).toBe(false);
	});

	it("the first scoreboard starts from zero, in its own order", () => {
		const steps = scoreboardSteps(
			[entry("Ana", 1, 875, null), entry("Bia", 2, 700, null)],
			[],
		);

		expect(steps.changed).toBe(true);
		expect(shown(steps.before)).toEqual([
			["Ana", 0, 875],
			["Bia", 0, 700],
		]);
		expect(steps.after.every((row) => !row.climbed)).toBe(true);
	});

	it("has nothing to animate when nothing changed", () => {
		const still = scoreboardSteps(
			[
				entry("Bia", 1, 1000, { rank: 1, total: 1000 }),
				entry("Ana", 2, 0, { rank: 2, total: 0 }),
			],
			[],
		);
		expect(still.changed).toBe(false);
		expect(still.before).toEqual(still.after);

		const nobodyScored = scoreboardSteps(
			[entry("Ana", 1, 0, null), entry("Bia", 2, 0, null)],
			[],
		);
		expect(nobodyScored.changed).toBe(false);
	});
});
