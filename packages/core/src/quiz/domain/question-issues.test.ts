import { describe, expect, it } from "vitest";

import { aQuestion } from "../testing/a-question";
import { blankQuestion, type Question } from "./question";
import { missingAnswerHints, questionIssues } from "./question-issues";

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
