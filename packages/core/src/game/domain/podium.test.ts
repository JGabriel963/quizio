import { describe, expect, it } from "vitest";

import { aGame, aPlayingGame } from "../testing/a-game";
import { endGame } from "./game";
import { nextStage } from "./game-progress";
import {
	PODIUM_REVEAL_MS,
	PODIUM_REVEAL_TOTAL_MS,
	podiumRevealRemainingMs,
} from "./podium";

const now = new Date("2026-06-01T12:00:00.000Z");
const later = (ms: number) => new Date(now.getTime() + ms);

const finished = nextStage(
	aPlayingGame("results", { questionIndex: 2, questionCount: 3, since: now }),
	{ timeLimitSeconds: 20, skip: false, now },
);

describe("podium reveal (spec 011, RN-10, RN-11)", () => {
	it("shows the third, the second and then the first, who takes longer", () => {
		expect(PODIUM_REVEAL_MS).toEqual({ 3: 2_000, 2: 4_000, 1: 7_000 });
		expect(PODIUM_REVEAL_TOTAL_MS).toBe(PODIUM_REVEAL_MS[1]);
	});

	it("counts the reveal from the instant the game finished", () => {
		expect(podiumRevealRemainingMs(finished, now)).toBe(7_000);
		expect(podiumRevealRemainingMs(finished, later(2_500))).toBe(4_500);
	});

	it("is over after the first place shows", () => {
		expect(podiumRevealRemainingMs(finished, later(7_000))).toBe(0);
		expect(podiumRevealRemainingMs(finished, later(86_400_000))).toBe(0);
	});

	it("is zero for a game that is not finished", () => {
		expect(podiumRevealRemainingMs(aGame(), now)).toBe(0);
		expect(podiumRevealRemainingMs(aPlayingGame("results"), now)).toBe(0);
		expect(podiumRevealRemainingMs(endGame(aGame(), "host", now), now)).toBe(0);
	});
});
