import { describe, expect, it } from "vitest";

import { aTrueFalseQuestion } from "../../quiz/testing/a-question";
import { aGameQuestion, someChoices } from "../testing/a-game-question";
import {
	answerDistribution,
	correctnessOf,
	InvalidAnswerError,
	parseAnswerChoices,
} from "./answer";
import { toGameQuestion } from "./game-question";

const single = aGameQuestion();
/** Answers 1 and 2 are right. */
const multiple = aGameQuestion({
	selection: "multiple",
	choices: someChoices(["a", "b", "c", "d"], [0, 1]),
});

describe("answer choices (spec 009)", () => {
	it("refuses an answer that is not of the question", () => {
		// The third slot was left empty in the editor, so it is not in the game.
		const question = aGameQuestion({
			choices: someChoices(["a", "b", "c", "d"]).filter(
				(choice) => choice.id !== "choice-3",
			),
		});

		expect(parseAnswerChoices(question, ["choice-4"])).toEqual(["choice-4"]);
		for (const choiceIds of [["choice-3"], ["choice-9"], []]) {
			expect(() => parseAnswerChoices(question, choiceIds)).toThrow(
				InvalidAnswerError,
			);
		}
	});

	it("single selection takes exactly one", () => {
		expect(() => parseAnswerChoices(single, ["choice-1", "choice-2"])).toThrow(
			InvalidAnswerError,
		);
	});

	it("multiple selection takes several, in the question's order, none repeated", () => {
		expect(parseAnswerChoices(multiple, ["choice-3", "choice-1"])).toEqual([
			"choice-1",
			"choice-3",
		]);
		expect(() =>
			parseAnswerChoices(multiple, ["choice-1", "choice-1"]),
		).toThrow(InvalidAnswerError);
	});
});

describe("correctness (spec 009, RN-24)", () => {
	it("grades single selection", () => {
		expect(correctnessOf(single, ["choice-1"])).toBe("correct");
		expect(correctnessOf(single, ["choice-2"])).toBe("wrong");
	});

	it("grades true/false", () => {
		const question = toGameQuestion(aTrueFalseQuestion({ correct: false }), 0);

		expect(correctnessOf(question, ["false"])).toBe("correct");
		expect(correctnessOf(question, ["true"])).toBe("wrong");
	});

	it("grades multiple selection", () => {
		expect(correctnessOf(multiple, ["choice-1", "choice-2"])).toBe("correct");
		expect(correctnessOf(multiple, ["choice-1"])).toBe("partiallyCorrect");
		expect(correctnessOf(multiple, ["choice-1", "choice-3"])).toBe("wrong");
		expect(correctnessOf(multiple, ["choice-3"])).toBe("wrong");
	});
});

describe("answer distribution (spec 009, RN-22)", () => {
	it("counts who chose each answer, zero included", () => {
		const answers = [
			{ choiceIds: ["choice-3"] },
			{ choiceIds: ["choice-3"] },
			{ choiceIds: ["choice-3"] },
			{ choiceIds: ["choice-1"] },
		];

		expect(answerDistribution(single, answers)).toEqual([
			{ choiceId: "choice-1", count: 1 },
			{ choiceId: "choice-2", count: 0 },
			{ choiceId: "choice-3", count: 3 },
			{ choiceId: "choice-4", count: 0 },
		]);
	});

	it("counts each marked answer once in multiple selection", () => {
		const answers = [
			{ choiceIds: ["choice-1", "choice-2"] },
			{ choiceIds: ["choice-1"] },
			{ choiceIds: ["choice-1", "choice-3"] },
		];

		expect(
			answerDistribution(multiple, answers).map((entry) => entry.count),
		).toEqual([3, 1, 1, 0]);
	});
});
