import { describe, expect, it } from "vitest";

import { calculateAnswerScore, InvalidResponseTimeError } from "./scoring";

const TWENTY_SECONDS = 20_000;

describe("calculateAnswerScore", () => {
	it("awards the full 1000 points for an instant correct answer", () => {
		expect(
			calculateAnswerScore({
				isCorrect: true,
				responseTimeMs: 0,
				timeLimitMs: TWENTY_SECONDS,
				pointsMultiplier: "standard",
			}),
		).toBe(1000);
	});

	it("decays linearly down to half the points at the time limit", () => {
		const score = (responseTimeMs: number) =>
			calculateAnswerScore({
				isCorrect: true,
				responseTimeMs,
				timeLimitMs: TWENTY_SECONDS,
				pointsMultiplier: "standard",
			});

		expect(score(5_000)).toBe(875);
		expect(score(10_000)).toBe(750);
		expect(score(TWENTY_SECONDS)).toBe(500);
	});

	it("matches Kahoot's documented example: 2s on a 30s question scores 967", () => {
		expect(
			calculateAnswerScore({
				isCorrect: true,
				responseTimeMs: 2_000,
				timeLimitMs: 30_000,
				pointsMultiplier: "standard",
			}),
		).toBe(967);
	});

	it("awards full points for any correct answer within the first half second", () => {
		const score = (responseTimeMs: number) =>
			calculateAnswerScore({
				isCorrect: true,
				responseTimeMs,
				timeLimitMs: TWENTY_SECONDS,
				pointsMultiplier: "standard",
			});

		expect(score(499)).toBe(1000);
		expect(score(500)).toBe(988);
	});

	it("rounds to the nearest integer", () => {
		expect(
			calculateAnswerScore({
				isCorrect: true,
				responseTimeMs: 3_333,
				timeLimitMs: TWENTY_SECONDS,
				pointsMultiplier: "standard",
			}),
		).toBe(917);
	});

	it("doubles the points for double-points questions", () => {
		expect(
			calculateAnswerScore({
				isCorrect: true,
				responseTimeMs: 10_000,
				timeLimitMs: TWENTY_SECONDS,
				pointsMultiplier: "double",
			}),
		).toBe(1500);
	});

	it("awards nothing for incorrect answers", () => {
		expect(
			calculateAnswerScore({
				isCorrect: false,
				responseTimeMs: 0,
				timeLimitMs: TWENTY_SECONDS,
				pointsMultiplier: "double",
			}),
		).toBe(0);
	});

	it("awards nothing on no-points questions even when correct", () => {
		expect(
			calculateAnswerScore({
				isCorrect: true,
				responseTimeMs: 0,
				timeLimitMs: TWENTY_SECONDS,
				pointsMultiplier: "noPoints",
			}),
		).toBe(0);
	});

	it.each([
		{ responseTimeMs: -1, timeLimitMs: TWENTY_SECONDS },
		{ responseTimeMs: TWENTY_SECONDS + 1, timeLimitMs: TWENTY_SECONDS },
		{ responseTimeMs: 0, timeLimitMs: 0 },
	])(
		"rejects response time $responseTimeMs outside [0, $timeLimitMs]",
		(times) => {
			expect(() =>
				calculateAnswerScore({
					isCorrect: true,
					pointsMultiplier: "standard",
					...times,
				}),
			).toThrow(InvalidResponseTimeError);
		},
	);
});
