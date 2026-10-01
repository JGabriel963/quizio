import { describe, expect, it } from "vitest";

import { aQuestion, aTrueFalseQuestion } from "../testing/a-question";
import { blankQuestion, type Question } from "./question";
import {
	incompleteQuestions,
	missingAnswerCount,
	missingAnswerHints,
	questionIssues,
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
