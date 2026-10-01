import { describe, expect, it } from "vitest";

import { aQuestion, aTrueFalseQuestion } from "../testing/a-question";
import { blankQuestion, type Question } from "./question";
import {
	newQuizVersion,
	parseVersionQuestions,
	sameQuestionLists,
} from "./quiz-version";

const now = new Date("2026-06-01T12:00:00.000Z");

const quizQuestion = aQuestion({
	id: "a",
	selection: "multiple",
	timeLimitSeconds: 45,
	points: "double",
	choices: [
		{ id: "choice-1", text: "Brasília", correct: true },
		{ id: "choice-2", text: "Rio", correct: false },
		{ id: "choice-3", text: null, correct: false },
		{ id: "choice-4", text: null, correct: false },
		{ id: "choice-5", text: "Salvador", correct: true },
		{ id: "choice-6", text: null, correct: false },
	],
});
const trueFalse = aTrueFalseQuestion({
	id: "b",
	correct: false,
	timeLimitSeconds: 10,
	points: "noPoints",
});
const published = [quizQuestion, trueFalse];

function withChoice(
	index: number,
	change: Partial<(typeof quizQuestion.choices)[number]>,
): Question {
	return {
		...quizQuestion,
		choices: quizQuestion.choices.map((choice, position) =>
			position === index ? { ...choice, ...change } : choice,
		),
	};
}

describe("newQuizVersion", () => {
	it("a version is a detached copy of the questions", () => {
		const version = newQuizVersion({
			quizId: "quiz-1",
			number: 1,
			questions: published,
			now,
		});

		expect(version).toEqual({
			quizId: "quiz-1",
			number: 1,
			questions: published,
			createdAt: now,
		});
		expect(version.questions).not.toBe(published);
		expect(version.questions[0]).not.toBe(quizQuestion);
		expect((version.questions[0] as typeof quizQuestion).choices[0]).not.toBe(
			quizQuestion.choices[0],
		);
	});
});

describe("sameQuestionLists", () => {
	it("equal lists have no changes", () => {
		expect(sameQuestionLists(published, [quizQuestion, trueFalse])).toBe(true);
		expect(sameQuestionLists([], [])).toBe(true);
	});

	it("ignores question ids", () => {
		expect(
			sameQuestionLists([quizQuestion], [{ ...quizQuestion, id: "copy" }]),
		).toBe(true);
	});

	it.each<[string, Question[]]>([
		["order", [trueFalse, quizQuestion]],
		["one fewer", [quizQuestion]],
		["one more", [quizQuestion, trueFalse, blankQuestion("c")]],
		["text", [{ ...quizQuestion, text: "Outra?" }, trueFalse]],
		["time", [{ ...quizQuestion, timeLimitSeconds: 20 }, trueFalse]],
		["points", [{ ...quizQuestion, points: "standard" }, trueFalse]],
		["selection", [{ ...quizQuestion, selection: "single" }, trueFalse]],
		["answer text", [withChoice(1, { text: "Recife" }), trueFalse]],
		["correct answer", [withChoice(1, { correct: true }), trueFalse]],
		[
			"answer count",
			[
				{ ...quizQuestion, choices: quizQuestion.choices.slice(0, 4) },
				trueFalse,
			],
		],
		["true/false answer", [quizQuestion, { ...trueFalse, correct: true }]],
		[
			"type",
			[
				quizQuestion,
				{
					...blankQuestion("b"),
					text: trueFalse.text,
					timeLimitSeconds: 10,
					points: "noPoints",
				},
			],
		],
	])("order, count, type and content are changes: %s", (_, changed) => {
		expect(sameQuestionLists(published, changed)).toBe(false);
		expect(sameQuestionLists(changed, published)).toBe(false);
	});
});

describe("parseVersionQuestions", () => {
	it("reads back what a version stores", () => {
		const stored = JSON.parse(JSON.stringify(published));

		expect(parseVersionQuestions(stored)).toEqual(published);
	});

	it("reads stored questions tolerantly", () => {
		expect(parseVersionQuestions(null)).toEqual([]);
		expect(parseVersionQuestions({})).toEqual([]);
		expect(
			parseVersionQuestions([
				"junk",
				{ id: "x", type: "slider" },
				{ type: "quiz" },
				{ id: "c", type: "quiz", text: 42, timeLimitSeconds: 25, points: "x" },
				{ id: "d", type: "trueFalse", text: "Certo?", correct: "yes" },
			]),
		).toEqual([
			blankQuestion("c"),
			{ ...blankQuestion("d", "trueFalse"), text: "Certo?" },
		]);
	});
});
