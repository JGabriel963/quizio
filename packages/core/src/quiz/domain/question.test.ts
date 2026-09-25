import { describe, expect, it } from "vitest";

import {
	blankQuestion,
	copyQuestion,
	parseQuestionText,
	QUESTION_TEXT_MAX_LENGTH,
	QuestionTextTooLongError,
} from "./question";

describe("blankQuestion", () => {
	it("creates a blank quiz question with no text", () => {
		expect(blankQuestion("question-1")).toEqual({
			id: "question-1",
			type: "quiz",
			text: null,
		});
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

describe("copyQuestion", () => {
	it("copies a question under a new id keeping its content", () => {
		const source = {
			id: "question-1",
			type: "quiz",
			text: "Capital?",
		} as const;

		expect(copyQuestion(source, "question-2")).toEqual({
			id: "question-2",
			type: "quiz",
			text: "Capital?",
		});
	});
});
