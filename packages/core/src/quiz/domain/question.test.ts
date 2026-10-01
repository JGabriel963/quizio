import { describe, expect, it } from "vitest";

import {
	blankContent,
	blankQuestion,
	CHOICE_TEXT_MAX_LENGTH,
	ChoiceTextTooLongError,
	choiceIdAt,
	copyQuestion,
	InvalidQuestionPointsError,
	InvalidQuestionTypeError,
	InvalidSelectionModeError,
	InvalidTimeLimitError,
	isBlankQuestion,
	parseChoiceText,
	parsePoints,
	parseQuestionText,
	parseQuestionType,
	parseQuizContent,
	parseSelection,
	parseStoredContent,
	parseTimeLimit,
	QUESTION_TEXT_MAX_LENGTH,
	QUESTION_TYPES,
	type Question,
	QuestionTextTooLongError,
	type QuizQuestion,
	questionContent,
	storedContent,
	TIME_LIMITS_SECONDS,
	toggledTrueFalseCorrect,
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

describe("true/false question", () => {
	it("a blank true/false question has no correct answer", () => {
		expect(blankQuestion("question-1", "trueFalse")).toEqual({
			id: "question-1",
			type: "trueFalse",
			text: null,
			timeLimitSeconds: 20,
			points: "standard",
			correct: null,
		});
	});

	it("offers quiz and true/false, and rejects an unknown question type", () => {
		expect(QUESTION_TYPES).toEqual(["quiz", "trueFalse"]);
		expect(parseQuestionType("trueFalse")).toBe("trueFalse");
		expect(() => parseQuestionType("slider")).toThrow(InvalidQuestionTypeError);
	});

	it("toggling the marked answer marks the other one", () => {
		expect(toggledTrueFalseCorrect(null, true)).toBe(true);
		expect(toggledTrueFalseCorrect(null, false)).toBe(false);
		expect(toggledTrueFalseCorrect(true, false)).toBe(false);
		expect(toggledTrueFalseCorrect(false, false)).toBe(true);
		expect(toggledTrueFalseCorrect(true, true)).toBe(false);
	});

	it("reads stored true/false content tolerantly", () => {
		expect(parseStoredContent("trueFalse", { correct: false })).toEqual({
			type: "trueFalse",
			correct: false,
		});
		for (const malformed of [null, {}, { correct: "yes" }, { choices: [] }]) {
			expect(parseStoredContent("trueFalse", malformed)).toEqual({
				type: "trueFalse",
				correct: null,
			});
		}
	});

	it("stores only what is specific to the type", () => {
		expect(
			storedContent({ ...blankQuestion("q", "trueFalse"), correct: true }),
		).toEqual({ correct: true });
		expect(storedContent(blankQuestion("q"))).toEqual({
			selection: "single",
			choices: emptyChoices(4),
		});
		expect(parseStoredContent("quiz", {})).toEqual({
			type: "quiz",
			selection: "single",
			choices: emptyChoices(4),
		});
	});

	it("gives a detached copy of the type's content", () => {
		const question = blankQuestion("q");

		const content = questionContent(question);

		expect(content).toEqual({
			type: "quiz",
			selection: "single",
			choices: emptyChoices(4),
		});
		expect(content.type === "quiz" && content.choices[0]).not.toBe(
			question.choices[0],
		);
		expect(blankContent("trueFalse")).toEqual({
			type: "trueFalse",
			correct: null,
		});
	});
});

describe("isBlankQuestion", () => {
	it("is true while nothing was written or marked, whatever the time and points", () => {
		expect(isBlankQuestion(blankQuestion("q"))).toBe(true);
		expect(isBlankQuestion(blankQuestion("q", "trueFalse"))).toBe(true);
		expect(
			isBlankQuestion({
				...blankQuestion("q"),
				timeLimitSeconds: 45,
				points: "double",
				selection: "multiple",
				choices: emptyChoices(6),
			}),
		).toBe(true);
	});

	it("is false once there is a text, an answer or a correct mark", () => {
		expect(isBlankQuestion({ ...blankQuestion("q"), text: "Capital?" })).toBe(
			false,
		);
		expect(
			isBlankQuestion({
				...blankQuestion("q"),
				choices: [
					{ id: "choice-1", text: null, correct: false },
					{ id: "choice-2", text: "Rio", correct: false },
					{ id: "choice-3", text: null, correct: false },
					{ id: "choice-4", text: null, correct: false },
				],
			}),
		).toBe(false);
		expect(
			isBlankQuestion({ ...blankQuestion("q", "trueFalse"), correct: false }),
		).toBe(false);
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

	it("accepts 160 characters counting accents and emoji as one", () => {
		expect(QUESTION_TEXT_MAX_LENGTH).toBe(160);
		const text = `${"á".repeat(QUESTION_TEXT_MAX_LENGTH - 1)}🎉`;

		expect(parseQuestionText(text)).toBe(text);
	});

	it("refuses 161 characters with QuestionTextTooLongError", () => {
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
		const source: QuizQuestion = {
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

	it("copies a true/false question under a new id", () => {
		const source: Question = {
			...blankQuestion("question-1", "trueFalse"),
			text: "A capital do Brasil é Brasília",
			timeLimitSeconds: 10,
			points: "noPoints",
			correct: true,
		};

		expect(copyQuestion(source, "question-2")).toEqual({
			...source,
			id: "question-2",
		});
	});
});
