import { describe, expect, it } from "vitest";

import { asSlider, asTypeAnswer } from "../testing/a-question";
import {
	AcceptedAnswerTooLongError,
	blankContent,
	blankQuestion,
	CHOICE_TEXT_MAX_LENGTH,
	ChoiceTextTooLongError,
	choiceIdAt,
	copyQuestion,
	defaultTimeLimitFor,
	fitTimeLimit,
	InvalidQuestionPointsError,
	InvalidQuestionTypeError,
	InvalidSelectionModeError,
	InvalidSliderNumberError,
	InvalidTimeLimitError,
	isBlankQuestion,
	parseAcceptedAnswer,
	parseChoiceText,
	parsePoints,
	parseQuestionText,
	parseQuestionType,
	parseQuizContent,
	parseSelection,
	parseSliderNumber,
	parseSliderUnit,
	parseStoredContent,
	parseTimeLimit,
	QUESTION_TEXT_MAX_LENGTH,
	QUESTION_TYPES,
	type Question,
	QuestionTextTooLongError,
	type QuizQuestion,
	questionContent,
	SLIDER_UNIT_MAX_LENGTH,
	SliderUnitTooLongError,
	storedContent,
	TIME_LIMITS_SECONDS,
	TYPE_ANSWER_MAX_LENGTH,
	timeLimitsFor,
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
			image: null,
			aiGenerated: false,
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
			image: null,
			aiGenerated: false,
			correct: null,
		});
	});

	it("offers quiz, true/false, type answer and slider, and rejects an unknown question type", () => {
		expect(QUESTION_TYPES).toEqual([
			"quiz",
			"trueFalse",
			"typeAnswer",
			"slider",
		]);
		expect(parseQuestionType("trueFalse")).toBe("trueFalse");
		expect(() => parseQuestionType("puzzle")).toThrow(InvalidQuestionTypeError);
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

describe("AI mark", () => {
	it("a blank question is not AI generated", () => {
		expect(blankQuestion("question-1").aiGenerated).toBe(false);
		expect(blankQuestion("question-1", "trueFalse").aiGenerated).toBe(false);
	});

	it("copies keep the AI mark", () => {
		const source: Question = {
			...blankQuestion("question-1"),
			aiGenerated: true,
		};

		expect(copyQuestion(source, "question-2").aiGenerated).toBe(true);
	});

	it("stored content does not carry the AI mark", () => {
		const source: Question = {
			...blankQuestion("question-1"),
			aiGenerated: true,
		};

		expect(storedContent(source)).not.toHaveProperty("aiGenerated");
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

describe("type answer question", () => {
	it("a blank type answer has one empty accepted answer, 30 s and standard points", () => {
		expect(QUESTION_TYPES).toContain("typeAnswer");
		expect(blankQuestion("question-1", "typeAnswer")).toEqual({
			id: "question-1",
			type: "typeAnswer",
			text: null,
			timeLimitSeconds: 30,
			points: "standard",
			image: null,
			aiGenerated: false,
			acceptedAnswers: [null],
		});
	});

	it("type answer time limits run from 20 s to 4 min", () => {
		expect(timeLimitsFor("typeAnswer")).toEqual([
			20, 30, 45, 60, 90, 120, 180, 240,
		]);
		expect(timeLimitsFor("quiz")).toEqual(TIME_LIMITS_SECONDS);
		expect(defaultTimeLimitFor("typeAnswer")).toBe(30);
		expect(defaultTimeLimitFor("trueFalse")).toBe(20);
	});

	it("fits a time below the type's minimum to it", () => {
		expect(fitTimeLimit("typeAnswer", 10)).toBe(20);
		expect(fitTimeLimit("typeAnswer", 45)).toBe(45);
		expect(fitTimeLimit("quiz", 5)).toBe(5);
	});

	it("parses stored accepted answers, tolerating missing or long ones", () => {
		expect(
			parseStoredContent("typeAnswer", {
				acceptedAnswers: ["Pedro", null, "Jesus"],
			}),
		).toEqual({
			type: "typeAnswer",
			acceptedAnswers: ["Pedro", null, "Jesus"],
		});
		expect(parseStoredContent("typeAnswer", {})).toEqual({
			type: "typeAnswer",
			acceptedAnswers: [null],
		});
		expect(
			parseStoredContent("typeAnswer", {
				acceptedAnswers: ["a".repeat(25), 3, "b", "c", "d", "e"],
			}),
		).toEqual({
			type: "typeAnswer",
			acceptedAnswers: ["a".repeat(TYPE_ANSWER_MAX_LENGTH), null, "b", "c"],
		});
	});

	it("refuses an accepted answer over 20 characters", () => {
		expect(parseAcceptedAnswer("  Pedro ")).toBe("Pedro");
		expect(parseAcceptedAnswer("   ")).toBeNull();
		expect(() => parseAcceptedAnswer("a".repeat(21))).toThrow(
			AcceptedAnswerTooLongError,
		);
	});

	it("copying a type answer copies its accepted answers", () => {
		const source: Question = {
			...blankQuestion("question-1", "typeAnswer"),
			acceptedAnswers: ["Pedro", "Jesus"],
		};

		const copy = copyQuestion(source, "question-2");

		expect(copy).toEqual({ ...source, id: "question-2" });
		expect(asTypeAnswer(copy).acceptedAnswers).not.toBe(
			asTypeAnswer(source).acceptedAnswers,
		);
	});

	it("a type answer with an empty main answer is blank", () => {
		const blank = blankQuestion("question-1", "typeAnswer");

		expect(isBlankQuestion(blank)).toBe(true);
		expect(isBlankQuestion({ ...blank, acceptedAnswers: ["Pedro"] })).toBe(
			false,
		);
		expect(blankContent("typeAnswer")).toEqual({
			type: "typeAnswer",
			acceptedAnswers: [null],
		});
	});
});

describe("slider question", () => {
	it("a blank slider has 0 to 50, no answer, no unit, the medium margin and 20 s", () => {
		expect(blankQuestion("question-1", "slider")).toEqual({
			id: "question-1",
			type: "slider",
			text: null,
			timeLimitSeconds: 20,
			points: "standard",
			image: null,
			aiGenerated: false,
			min: 0,
			max: 50,
			answer: null,
			unit: null,
			answerMargin: "medium",
		});
		expect(isBlankQuestion(blankQuestion("question-1", "slider"))).toBe(true);
		expect(
			isBlankQuestion({ ...blankQuestion("question-1", "slider"), answer: 25 }),
		).toBe(false);
	});

	it("slider time limits run from 10 s to 4 min", () => {
		expect(timeLimitsFor("slider")).toEqual([
			10, 15, 20, 30, 45, 60, 90, 120, 180, 240,
		]);
		expect(defaultTimeLimitFor("slider")).toBe(20);
	});

	it("fits 5 s to 10 s for a slider", () => {
		expect(fitTimeLimit("slider", 5)).toBe(10);
		expect(fitTimeLimit("slider", 15)).toBe(15);
	});

	it("parses a slider number with a comma or a dot", () => {
		expect(parseSliderNumber("2000.03")).toBe(2000.03);
		expect(parseSliderNumber("2000,03")).toBe(2000.03);
		expect(parseSliderNumber(" 600 ")).toBe(600);
		expect(parseSliderNumber("0,5")).toBe(0.5);
		expect(parseSliderNumber("9999999999")).toBe(9999999999);
	});

	it("parses negative numbers", () => {
		expect(parseSliderNumber("-100,3")).toBe(-100.3);
		expect(parseSliderNumber("−100.3")).toBe(-100.3);
	});

	it("refuses a third decimal, letters, two separators and an 11th character", () => {
		for (const raw of [
			"2000,031",
			"12a",
			"1.000,5",
			"1,2,3",
			"",
			"-",
			",5",
			"5,",
			"12345678901",
			"-1234567890",
		]) {
			expect(() => parseSliderNumber(raw), raw).toThrow(
				InvalidSliderNumberError,
			);
		}
	});

	it("refuses a unit over 20 characters; an empty unit is none", () => {
		expect(parseSliderUnit(" anos ")).toBe("anos");
		expect(parseSliderUnit("  ")).toBeNull();
		expect(parseSliderUnit("a".repeat(SLIDER_UNIT_MAX_LENGTH))).toHaveLength(
			20,
		);
		expect(() => parseSliderUnit("a".repeat(21))).toThrow(
			SliderUnitTooLongError,
		);
	});

	it("parses stored slider content, tolerating bad numbers and an unknown margin", () => {
		expect(
			parseStoredContent("slider", {
				min: -100.3,
				max: 2000.03,
				answer: 600,
				unit: "anos",
				answerMargin: "high",
			}),
		).toEqual({
			type: "slider",
			min: -100.3,
			max: 2000.03,
			answer: 600,
			unit: "anos",
			answerMargin: "high",
		});
		expect(
			parseStoredContent("slider", {
				min: "x",
				max: Number.NaN,
				answer: 1.234,
				unit: 3,
				answerMargin: "huge",
			}),
		).toEqual({
			type: "slider",
			min: null,
			max: null,
			answer: null,
			unit: null,
			answerMargin: "medium",
		});
		expect(parseStoredContent("slider", undefined)).toEqual(
			blankContent("slider"),
		);
	});

	it("copying a slider copies its scale", () => {
		const source = {
			...blankQuestion("question-1", "slider"),
			min: 100,
			max: 900,
			answer: 600,
			unit: "anos",
			answerMargin: "high" as const,
		};
		const copy = asSlider(copyQuestion(source, "question-2"));
		expect(copy).toEqual({ ...source, id: "question-2" });
		expect(storedContent(copy)).toEqual({
			min: 100,
			max: 900,
			answer: 600,
			unit: "anos",
			answerMargin: "high",
		});
		expect(questionContent(copy).type).toBe("slider");
	});
});
