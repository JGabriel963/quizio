import { describe, expect, it } from "vitest";

import { anAnswer, aPuzzleGameQuestion } from "../testing/a-game-question";
import { puzzleResultsOf } from "./puzzle-results";

describe("puzzle results (spec 033, RN-26)", () => {
	it("counts right and wrong answers, not the missing ones", () => {
		const puzzle = aPuzzleGameQuestion();
		const answers = [
			anAnswer({ playerId: "a", correctness: "correct" }),
			anAnswer({ playerId: "b", correctness: "correct" }),
			anAnswer({ playerId: "c", correctness: "correct" }),
			anAnswer({ playerId: "d", correctness: "wrong" }),
			anAnswer({ playerId: "e", correctness: "wrong" }),
		];

		expect(puzzleResultsOf(puzzle, answers)).toEqual({
			order: ["choice-1", "choice-2", "choice-3", "choice-4"],
			correct: 3,
			wrong: 2,
		});
	});

	it("nobody answering gives zero and zero", () => {
		expect(puzzleResultsOf(aPuzzleGameQuestion(), [])).toMatchObject({
			correct: 0,
			wrong: 0,
		});
	});
});
