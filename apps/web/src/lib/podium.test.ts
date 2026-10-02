import { describe, expect, it } from "vitest";

import { podiumOf, revealedPlaces } from "./podium";

const standing = (rank: number, nickname: string, total: number) => ({
	playerId: `p${rank}`,
	nickname,
	total,
	rank,
});

describe("revealedPlaces (spec 011, RN-10)", () => {
	it("shows nobody before two seconds", () => {
		expect(revealedPlaces(7_000)).toEqual([]);
		expect(revealedPlaces(5_001)).toEqual([]);
	});

	it("reveals third, second and first by time", () => {
		expect(revealedPlaces(5_000)).toEqual([3]);
		expect(revealedPlaces(3_000)).toEqual([2, 3]);
		expect(revealedPlaces(1)).toEqual([2, 3]);
		expect(revealedPlaces(0)).toEqual([2, 1, 3]);
	});
});

describe("podiumOf (spec 011, RN-08, RN-09)", () => {
	it("places the first three on the steps, the first in the middle", () => {
		const podium = podiumOf([
			standing(1, "Caio", 975),
			standing(2, "Ana", 950),
			standing(3, "Fábio", 925),
			standing(4, "Bia", 900),
		]);

		expect(
			podium.map(({ place, standing }) => [place, standing?.nickname]),
		).toEqual([
			[2, "Ana"],
			[1, "Caio"],
			[3, "Fábio"],
		]);
	});

	it("leaves the steps without a player empty", () => {
		expect(
			podiumOf([standing(1, "Beto", 2900), standing(2, "Ana", 2850)]).map(
				(step) => step.standing?.nickname ?? null,
			),
		).toEqual(["Ana", "Beto", null]);
		expect(
			podiumOf([standing(1, "Ana", 0)]).map(
				(step) => step.standing?.nickname ?? null,
			),
		).toEqual([null, "Ana", null]);
	});
});
