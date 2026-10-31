import { describe, expect, it } from "vitest";

import {
	aPuzzleQuestion,
	aQuestion,
	aSliderQuestion,
	aTrueFalseQuestion,
	aTypeAnswerQuestion,
} from "../testing/a-question";
import { blankQuestion, type Question } from "./question";
import {
	incompleteQuestions,
	missingAnswerCount,
	missingAnswerHints,
	questionIssues,
	sliderScaleOf,
} from "./question-issues";

function withChoices(
	texts: (string | null)[],
	correct: number[] = [],
	text: string | null = "Capital?",
): Question {
	return aQuestion({
		text,
		choices: texts.map((choiceText, index) => ({
			id: `choice-${index + 1}`,
			text: choiceText,
			textFormatting: {},
			image: null,
			correct: correct.includes(index),
		})),
	});
}

describe("questionIssues", () => {
	it("a blank question misses text, answers and a correct one", () => {
		expect(questionIssues(blankQuestion("q"))).toEqual([
			"missingText",
			"notEnoughAnswers",
			"noCorrectAnswer",
		]);
	});

	it("needs at least two answers with text", () => {
		expect(
			questionIssues(withChoices(["Brasília", null, null, null], [0])),
		).toEqual(["notEnoughAnswers"]);
	});

	it("needs a correct answer", () => {
		expect(
			questionIssues(withChoices(["Brasília", "Rio", null, null])),
		).toEqual(["noCorrectAnswer"]);
	});

	it("a complete question has no issues, whatever slots hold the answers", () => {
		expect(
			questionIssues(
				withChoices([null, "Brasília", null, null, null, "Rio"], [5]),
			),
		).toEqual([]);
	});
});

describe("questionIssues of a true/false question", () => {
	it("misses its text and its correct answer", () => {
		expect(
			questionIssues(aTrueFalseQuestion({ text: null, correct: null })),
		).toEqual(["missingText", "noCorrectTrueFalse"]);
		expect(questionIssues(aTrueFalseQuestion({ correct: null }))).toEqual([
			"noCorrectTrueFalse",
		]);
	});

	it("is complete with a text and either answer marked", () => {
		expect(questionIssues(aTrueFalseQuestion({ correct: false }))).toEqual([]);
		expect(questionIssues(aTrueFalseQuestion({ correct: true }))).toEqual([]);
	});

	it("has no answer hints", () => {
		expect(missingAnswerHints(aTrueFalseQuestion())).toEqual([]);
	});
});

describe("missingAnswerHints", () => {
	it("hints slots 1 and 2 while they are empty and fewer than 2 answers exist", () => {
		expect(missingAnswerHints(withChoices([null, null, null, null]))).toEqual([
			1, 2,
		]);
		expect(
			missingAnswerHints(withChoices(["Brasília", null, null, null])),
		).toEqual([2]);
		expect(missingAnswerHints(withChoices([null, null, "Rio", null]))).toEqual([
			1, 2,
		]);
	});

	it("no hints once two answers exist, even outside slots 1 and 2", () => {
		expect(
			missingAnswerHints(withChoices(["Brasília", null, "Rio", null])),
		).toEqual([]);
	});
});

describe("incompleteQuestions", () => {
	it("lists incomplete questions in order with their issues", () => {
		const complete = withChoices(["Brasília", "Rio", null, null], [0]);
		const noCorrect = withChoices(["Brasília", "Rio", null, null]);
		const blank = blankQuestion("blank");

		expect(incompleteQuestions([complete, noCorrect, blank])).toEqual([
			{ question: noCorrect, position: 2, issues: ["noCorrectAnswer"] },
			{
				question: blank,
				position: 3,
				issues: ["missingText", "notEnoughAnswers", "noCorrectAnswer"],
			},
		]);
		expect(incompleteQuestions([complete])).toEqual([]);
	});

	it("a true/false question without a correct answer", () => {
		const question = aTrueFalseQuestion({ correct: null });

		expect(incompleteQuestions([question])).toEqual([
			{ question, position: 1, issues: ["noCorrectTrueFalse"] },
		]);
	});
});

describe("missingAnswerCount", () => {
	it("counts the missing answers", () => {
		expect(missingAnswerCount(blankQuestion("q"))).toBe(2);
		expect(
			missingAnswerCount(withChoices([null, null, "Rio", null], [2])),
		).toBe(1);
		expect(
			missingAnswerCount(withChoices(["Brasília", "Rio", "Recife", null])),
		).toBe(0);
		expect(missingAnswerCount(aTrueFalseQuestion())).toBe(0);
	});
});

describe("questionIssues of a type answer question", () => {
	it("a type answer without accepted answers is incomplete", () => {
		expect(
			questionIssues(aTypeAnswerQuestion({ acceptedAnswers: [null, null] })),
		).toEqual(["noAcceptedAnswer"]);
		expect(questionIssues(blankQuestion("question-1", "typeAnswer"))).toEqual([
			"missingText",
			"noAcceptedAnswer",
		]);
	});

	it("an accepted answer of signs only does not count", () => {
		expect(
			questionIssues(aTypeAnswerQuestion({ acceptedAnswers: ["?!"] })),
		).toEqual(["noAcceptedAnswer"]);
	});

	it("a type answer with an accepted answer and a text is complete", () => {
		expect(
			questionIssues(aTypeAnswerQuestion({ acceptedAnswers: [null, "Pedro"] })),
		).toEqual([]);
		expect(missingAnswerCount(aTypeAnswerQuestion())).toBe(0);
		expect(missingAnswerHints(aTypeAnswerQuestion())).toEqual([]);
	});
});

describe("questionIssues of a slider", () => {
	it("a slider without an answer is incomplete", () => {
		expect(questionIssues(aSliderQuestion({ answer: null }))).toEqual([
			"noSliderAnswer",
		]);
		expect(questionIssues(blankQuestion("question-1", "slider"))).toEqual([
			"missingText",
			"noSliderAnswer",
		]);
	});

	it("an empty or inverted range is an invalid range", () => {
		for (const range of [
			{ min: null },
			{ max: null },
			{ min: 900, max: 900 },
			{ min: 900, max: 100 },
		]) {
			expect(questionIssues(aSliderQuestion(range))).toEqual([
				"invalidSliderRange",
			]);
		}
	});

	it("an answer outside the range is out of range", () => {
		expect(questionIssues(aSliderQuestion({ max: 200 }))).toEqual([
			"sliderAnswerOutOfRange",
		]);
		expect(questionIssues(aSliderQuestion({ min: 700 }))).toEqual([
			"sliderAnswerOutOfRange",
		]);
		expect(questionIssues(aSliderQuestion({ answer: 900 }))).toEqual([]);
	});

	it("a complete slider has a scale", () => {
		expect(sliderScaleOf(aSliderQuestion({ answerMargin: "low" }))).toEqual({
			min: 100,
			max: 900,
			answer: 600,
			margin: "low",
		});
		expect(sliderScaleOf(aSliderQuestion({ max: 200 }))).toBeNull();
		expect(sliderScaleOf(aSliderQuestion({ answer: null }))).toBeNull();
	});
});

describe("questionIssues of a puzzle", () => {
	it("a puzzle with two filled slots does not have enough answers", () => {
		expect(
			questionIssues(
				aPuzzleQuestion({ items: ["Nilo", "Amazonas", null, null] }),
			),
		).toEqual(["notEnoughPuzzleItems"]);
		expect(questionIssues(blankQuestion("question-1", "puzzle"))).toEqual([
			"missingText",
			"notEnoughPuzzleItems",
		]);
	});

	it("three filled slots with an empty one between are enough", () => {
		expect(
			questionIssues(
				aPuzzleQuestion({ items: ["Nilo", "Amazonas", null, "Yangtzé"] }),
			),
		).toEqual([]);
		expect(questionIssues(aPuzzleQuestion())).toEqual([]);
	});
});

describe("image answers (spec 049, RN-02)", () => {
	const image = { key: "media/ana/a.png", crop: null, altText: null };

	it("a quiz of image answers is complete", () => {
		const question = aQuestion({
			text: "Prato típico do Piauí?",
			choices: [0, 1, 2, 3].map((index) => ({
				id: `choice-${index + 1}`,
				text: null,
				textFormatting: {},
				image: { ...image, key: `media/ana/${index}.png` },
				correct: index === 0,
			})),
		});

		expect(questionIssues(question)).toEqual([]);
		expect(missingAnswerHints(question)).toEqual([]);
	});

	it("a puzzle of image answers is complete", () => {
		const question = aPuzzleQuestion({
			items: [null, null, "Ar", null],
			itemImages: [image, { ...image, key: "media/ana/b.png" }, null, null],
		});

		expect(questionIssues(question)).toEqual([]);
	});
});
