import { describe, expect, it } from "vitest";

import { aTrueFalseQuestion } from "../../quiz/testing/a-question";
import {
	aGameQuestion,
	aSliderGameQuestion,
	someChoices,
} from "../testing/a-game-question";
import {
	answerDistribution,
	answerPoints,
	correctnessOf,
	gradeAnswer,
	InvalidAnswerError,
	parseAnswerChoices,
	parseAnswerResponse,
	reviewedPoints,
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

describe("answerPoints (spec 010)", () => {
	it("scores by speed, down to half the points at the time limit", () => {
		expect(answerPoints(single, ["choice-1"], 300)).toBe(1000);
		expect(answerPoints(single, ["choice-1"], 5_000)).toBe(875);
		expect(answerPoints(single, ["choice-1"], 12_000)).toBe(700);
		expect(answerPoints(single, ["choice-1"], 19_900)).toBe(503);
		expect(answerPoints(single, ["choice-1"], 20_000)).toBe(500);
	});

	it("follows the official example: 2 s of 30 s is 967", () => {
		const question = aGameQuestion({ timeLimitSeconds: 30 });

		expect(answerPoints(question, ["choice-1"], 2_000)).toBe(967);
	});

	it("doubles the points of a double-points question", () => {
		const question = aGameQuestion({ points: "double" });

		expect(answerPoints(question, ["choice-1"], 5_000)).toBe(1750);
	});

	it("a wrong answer and a no-points question score nothing", () => {
		expect(answerPoints(single, ["choice-2"], 1_000)).toBe(0);
		expect(
			answerPoints(aGameQuestion({ points: "noPoints" }), ["choice-1"], 1_000),
		).toBe(0);
	});

	it("scores multiple selection per right answer marked, nothing with a wrong one", () => {
		const question = aGameQuestion({
			timeLimitSeconds: 30,
			selection: "multiple",
			choices: someChoices(["a", "b", "c", "d"], [0, 1, 2]),
		});

		expect(
			answerPoints(question, ["choice-1", "choice-2", "choice-3"], 8_000),
		).toBe(2600);
		expect(answerPoints(question, ["choice-1", "choice-2"], 8_000)).toBe(1733);
		expect(
			answerPoints(question, ["choice-1", "choice-2", "choice-4"], 8_000),
		).toBe(0);
	});

	it("scores true/false like any other question", () => {
		const question = toGameQuestion(aTrueFalseQuestion({ correct: true }), 0);

		expect(answerPoints(question, ["true"], 10_000)).toBe(750);
		expect(answerPoints(question, ["false"], 10_000)).toBe(0);
	});
});

describe("typed answers (spec 031)", () => {
	const typeAnswer = aGameQuestion({
		type: "typeAnswer",
		timeLimitSeconds: 30,
		choices: [],
		acceptedAnswers: ["The Colosseum", "Colosseum", "Colosseum in Rome"],
	});
	const grade = (text: string, responseTimeMs = 300) =>
		gradeAnswer(
			typeAnswer,
			{ choiceIds: [], text, value: null },
			responseTimeMs,
		);

	it("a typed answer equal to an accepted one after normalization is correct", () => {
		expect(grade("  COLOSSEUM! ").correctness).toBe("correct");
	});

	it("any accepted answer is correct", () => {
		expect(grade("colosseum in rome").correctness).toBe("correct");
		expect(grade("the colosseum").correctness).toBe("correct");
	});

	it("one letter off is wrong", () => {
		expect(grade("the coloseum")).toEqual({ correctness: "wrong", points: 0 });
	});

	it("an emoji-only answer matches only emojis", () => {
		const pizza = aGameQuestion({
			type: "typeAnswer",
			choices: [],
			acceptedAnswers: ["🍕"],
		});

		expect(
			gradeAnswer(pizza, { choiceIds: [], text: "🍕", value: null }, 0)
				.correctness,
		).toBe("correct");
		expect(
			gradeAnswer(pizza, { choiceIds: [], text: "pizza", value: null }, 0)
				.correctness,
		).toBe("wrong");
	});

	it("refuses a type answer without text, over 20 characters or with choices", () => {
		expect(parseAnswerResponse(typeAnswer, { text: "  Pedro " })).toEqual({
			choiceIds: [],
			text: "Pedro",
			value: null,
		});
		for (const raw of [
			{},
			{ text: "   " },
			{ text: "a".repeat(21) },
			{ text: "Pedro", choiceIds: ["choice-1"] },
		]) {
			expect(() => parseAnswerResponse(typeAnswer, raw)).toThrow(
				InvalidAnswerError,
			);
		}
	});

	it("refuses text for a choice question", () => {
		expect(() =>
			parseAnswerResponse(aGameQuestion(), { text: "Brasília" }),
		).toThrow(InvalidAnswerError);
		expect(
			parseAnswerResponse(aGameQuestion(), { choiceIds: ["choice-1"] }),
		).toEqual({ choiceIds: ["choice-1"], text: null, value: null });
	});

	it("points of a right typed answer follow the speed formula", () => {
		expect(grade("Colosseum", 300).points).toBe(1000);
		expect(grade("Colosseum", 15_000).points).toBe(750);
	});

	it("reviewed points: right as if on arrival, wrong as zero", () => {
		expect(reviewedPoints(typeAnswer, true, 15_000)).toBe(750);
		expect(reviewedPoints(typeAnswer, false, 15_000)).toBe(0);
		expect(reviewedPoints({ ...typeAnswer, points: "double" }, true, 300)).toBe(
			2000,
		);
	});
});

describe("slider answers (spec 032)", () => {
	const slider = aSliderGameQuestion();

	it("a slider takes a value that is a position of the scale", () => {
		expect(parseAnswerResponse(slider, { value: 600 })).toEqual({
			choiceIds: [],
			text: null,
			value: 600,
		});
		expect(parseAnswerResponse(slider, { value: 104 }).value).toBe(104);
	});

	it("refuses a value off the positions, a value for a choice question and choices for a slider", () => {
		for (const raw of [
			{ value: 601 },
			{ value: 100 },
			{ value: Number.NaN },
			{},
			{ value: 600, choiceIds: ["choice-1"] },
			{ value: 600, text: "600" },
		]) {
			expect(() => parseAnswerResponse(slider, raw)).toThrow(
				InvalidAnswerError,
			);
		}
		expect(() =>
			parseAnswerResponse(single, { choiceIds: ["choice-1"], value: 1 }),
		).toThrow(InvalidAnswerError);
	});

	it("grades the answer as correct, almost correct or wrong with its points", () => {
		const grade = (value: number, responseTimeMs = 0) =>
			gradeAnswer(
				slider,
				parseAnswerResponse(slider, { value }),
				responseTimeMs,
			);

		expect(grade(600)).toEqual({ correctness: "correct", points: 1000 });
		expect(grade(600, 20_000)).toEqual({ correctness: "correct", points: 900 });
		expect(grade(640)).toEqual({ correctness: "almostCorrect", points: 600 });
		expect(grade(680)).toEqual({ correctness: "almostCorrect", points: 200 });
		expect(grade(688)).toEqual({ correctness: "wrong", points: 0 });
	});
});
