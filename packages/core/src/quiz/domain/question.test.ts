import { describe, expect, it } from "vitest";

import {
	blankQuestion,
	CHOICE_TEXT_MAX_LENGTH,
	ChoiceTextTooLongError,
	choiceIdAt,
	copyQuestion,
	InvalidQuestionPointsError,
	InvalidSelectionModeError,
	InvalidTimeLimitError,
	parseChoiceText,
	parsePoints,
	parseQuestionText,
	parseQuizContent,
	parseSelection,
	parseTimeLimit,
	QUESTION_TEXT_MAX_LENGTH,
	type Question,
	QuestionTextTooLongError,
	TIME_LIMITS_SECONDS,
} from "./question";

const emptyChoices = (count: number) =>
	Array.from({ length: count }, (_, index) => ({
		id: choiceIdAt(index),
		text: null,
		correct: false,
	}));

describe("blankQuestion", () => {
	it("has four empty single-choice answers, 20 s and standard points", () => {
		expect(blankQuestion("question-1")).toEqual({
			id: "question-1",
			type: "quiz",
			text: null,
			timeLimitSeconds: 20,
			points: "standard",
			selection: "single",
			choices: emptyChoices(4),
		});
	});

	it("identifies choices by position", () => {
		expect(blankQuestion("q").choices.map(({ id }) => id)).toEqual([
			"choice-1",
			"choice-2",
			"choice-3",
			"choice-4",
		]);
	});
});

describe("parseQuestionText", () => {
	it("trims the text and stores whitespace-only text as null", () => {
		expect(parseQuestionText("  Capital do Brasil?  ")).toBe(
			"Capital do Brasil?",
		);
		expect(parseQuestionText("   ")).toBeNull();
		expect(parseQuestionText(null)).toBeNull();
	});

	it("accepts 120 characters counting accents and emoji as one", () => {
		const text = `${"á".repeat(QUESTION_TEXT_MAX_LENGTH - 1)}🎉`;

		expect(parseQuestionText(text)).toBe(text);
	});

	it("refuses 121 characters with QuestionTextTooLongError", () => {
		const text = "a".repeat(QUESTION_TEXT_MAX_LENGTH + 1);

		expect(() => parseQuestionText(text)).toThrow(QuestionTextTooLongError);
	});
});

describe("parseChoiceText", () => {
	it("trims, turns blank into null and allows 75 characters", () => {
		expect(parseChoiceText("  Brasília ")).toBe("Brasília");
		expect(parseChoiceText("  ")).toBeNull();
		expect(parseChoiceText("é".repeat(CHOICE_TEXT_MAX_LENGTH))).toHaveLength(
			CHOICE_TEXT_MAX_LENGTH,
		);
		expect(() =>
			parseChoiceText("a".repeat(CHOICE_TEXT_MAX_LENGTH + 1)),
		).toThrow(ChoiceTextTooLongError);
	});
});

describe("time, points and selection", () => {
	it("offers the Kahoot time limits", () => {
		expect(TIME_LIMITS_SECONDS).toEqual([
			5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240,
		]);
		expect(parseTimeLimit(90)).toBe(90);
	});

	it("rejects time limits outside the list", () => {
		expect(() => parseTimeLimit(25)).toThrow(InvalidTimeLimitError);
		expect(() => parseTimeLimit(300)).toThrow(InvalidTimeLimitError);
	});

	it("rejects unknown points and selection modes", () => {
		expect(parsePoints("double")).toBe("double");
		expect(() => parsePoints("triple")).toThrow(InvalidQuestionPointsError);
		expect(parseSelection("multiple")).toBe("multiple");
		expect(() => parseSelection("any")).toThrow(InvalidSelectionModeError);
	});
});

describe("parseQuizContent", () => {
	it("reads stored quiz content", () => {
		const content = {
			selection: "multiple",
			choices: [
				{ id: "choice-1", text: "Brasília", correct: true },
				{ id: "choice-2", text: "Rio", correct: true },
				{ id: "choice-3", text: null, correct: false },
				{ id: "choice-4", text: null, correct: false },
				{ id: "choice-5", text: "Salvador", correct: false },
				{ id: "choice-6", text: null, correct: false },
			],
		};

		expect(parseQuizContent(content)).toEqual(content);
	});

	it("parses quiz content tolerantly, completing defaults", () => {
		expect(parseQuizContent({})).toEqual({
			selection: "single",
			choices: emptyChoices(4),
		});
		expect(parseQuizContent(null)).toEqual({
			selection: "single",
			choices: emptyChoices(4),
		});
		expect(
			parseQuizContent({
				selection: "weird",
				choices: [{ id: "choice-1", text: 42, correct: "yes" }],
			}),
		).toEqual({ selection: "single", choices: emptyChoices(4) });
	});
});

describe("copyQuestion", () => {
	it("copies every field under a new id", () => {
		const source: Question = {
			...blankQuestion("question-1"),
			text: "Capital?",
			timeLimitSeconds: 45,
			points: "double",
			selection: "multiple",
		};

		const copy = copyQuestion(source, "question-2");

		expect(copy).toEqual({ ...source, id: "question-2" });
		expect(copy.choices).not.toBe(source.choices);
		expect(copy.choices[0]).not.toBe(source.choices[0]);
	});
});
