import { describe, expect, it } from "vitest";

import { characterCount } from "../../shared/domain/text-length";
import {
	assertQuizVisibility,
	DEFAULT_QUIZ_VISIBILITY,
	displayQuizTitle,
	duplicateQuizTitle,
	InvalidQuizVisibilityError,
	parseQuizDescription,
	parseQuizTitle,
	QuizDescriptionTooLongError,
	QuizTitleTooLongError,
	quizSearchText,
} from "./quiz-details";

describe("quiz title", () => {
	it("treats blank titles as absent and displays 'Quiz sem título'", () => {
		expect(parseQuizTitle(null)).toBeNull();
		expect(parseQuizTitle("   ")).toBeNull();
		expect(parseQuizTitle("  Bom de Bíblia  ")).toBe("Bom de Bíblia");
		expect(displayQuizTitle(null)).toBe("Quiz sem título");
		expect(displayQuizTitle("Geografia")).toBe("Geografia");
	});

	it("accepts a 95-character title and rejects 96", () => {
		expect(parseQuizTitle("a".repeat(95))).toBe("a".repeat(95));
		expect(() => parseQuizTitle("a".repeat(96))).toThrow(QuizTitleTooLongError);
	});

	it("measures the title after trimming surrounding spaces", () => {
		expect(parseQuizTitle(`  ${"a".repeat(95)}  `)).toBe("a".repeat(95));
	});
});

describe("quiz description", () => {
	it("accepts a 500-character description and rejects 501", () => {
		expect(parseQuizDescription("a".repeat(500))).toBe("a".repeat(500));
		expect(() => parseQuizDescription("a".repeat(501))).toThrow(
			QuizDescriptionTooLongError,
		);
	});

	it("treats blank descriptions as absent", () => {
		expect(parseQuizDescription(null)).toBeNull();
		expect(parseQuizDescription(" \n ")).toBeNull();
	});
});

describe("quiz visibility", () => {
	it("rejects visibilities other than private and unlisted", () => {
		expect(assertQuizVisibility("private")).toBe("private");
		expect(assertQuizVisibility("unlisted")).toBe("unlisted");
		expect(() => assertQuizVisibility("public")).toThrow(
			InvalidQuizVisibilityError,
		);
	});

	it("defaults to private", () => {
		expect(DEFAULT_QUIZ_VISIBILITY).toBe("private");
	});
});

describe("duplicate title", () => {
	it("appends ' (cópia)' to the display title", () => {
		expect(duplicateQuizTitle("Bom de Bíblia (Junho)")).toBe(
			"Bom de Bíblia (Junho) (cópia)",
		);
		expect(duplicateQuizTitle(null)).toBe("Quiz sem título (cópia)");
	});

	it("truncates the base so a duplicate title fits 95 characters", () => {
		const copy = duplicateQuizTitle("a".repeat(95));

		expect(characterCount(copy)).toBe(95);
		expect(copy.endsWith(" (cópia)")).toBe(true);
	});

	it("drops spaces left at the end of a truncated base", () => {
		expect(duplicateQuizTitle(`${"a".repeat(86)} ${"b".repeat(8)}`)).toBe(
			`${"a".repeat(86)} (cópia)`,
		);
	});
});

describe("quiz search text", () => {
	it("builds the search text from the display title", () => {
		expect(quizSearchText("BÍBLIA KIDS")).toBe("biblia kids");
		expect(quizSearchText(null)).toBe("quiz sem titulo");
	});
});
