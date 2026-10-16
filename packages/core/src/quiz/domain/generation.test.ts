import { describe, expect, it } from "vitest";

import {
	DEFAULT_GENERATION_OPTIONS,
	GENERATION_COUNTS,
	GENERATION_FORMATS,
	GENERATION_LANGUAGES,
	GENERATION_MAX_PAGES,
	GENERATION_MAX_QUESTIONS,
	GENERATION_TOPIC_MAX_LENGTH,
	GenerationTopicEmptyError,
	GenerationTopicTooLongError,
	InvalidGenerationOptionsError,
	InvalidSourcePagesError,
	parseGenerationOptions,
	parseSourcePages,
	parseStoredGenerationOptions,
	parseTopicText,
	SKILL_LEVELS,
} from "./generation";

describe("parseGenerationOptions", () => {
	it("accepts the listed formats, languages, levels and counts", () => {
		expect(GENERATION_FORMATS).toEqual([
			"quiz",
			"trueFalse",
			"mixed",
			"extract",
		]);
		expect(SKILL_LEVELS).toEqual(["beginner", "intermediate", "advanced"]);
		expect(GENERATION_LANGUAGES).toEqual([
			"pt",
			"en",
			"es",
			"fr",
			"de",
			"it",
			"auto",
		]);
		expect(GENERATION_COUNTS).toEqual([5, 10, 20, 30]);
		expect(
			parseGenerationOptions(
				{ format: "mixed", language: "en", level: "advanced", count: 10 },
				"topic",
			),
		).toEqual({
			format: "mixed",
			language: "en",
			level: "advanced",
			count: 10,
		});
	});

	it.each([
		{ format: "slider" },
		{ language: "jp" },
		{ level: "expert" },
		{ count: 15 },
	])("rejects an option outside the lists: %o", (override) => {
		expect(() =>
			parseGenerationOptions(
				{ ...DEFAULT_GENERATION_OPTIONS, ...override },
				"topic",
			),
		).toThrow(InvalidGenerationOptionsError);
	});

	it("extract needs a PDF source", () => {
		expect(() =>
			parseGenerationOptions(
				{ ...DEFAULT_GENERATION_OPTIONS, format: "extract" },
				"topic",
			),
		).toThrow(InvalidGenerationOptionsError);
	});

	it("extract forces auto language and ignores level and count", () => {
		expect(
			parseGenerationOptions(
				{ format: "extract", language: "en", level: "advanced", count: 5 },
				"pdf",
			),
		).toEqual({
			format: "extract",
			language: "auto",
			level: "intermediate",
			count: GENERATION_MAX_QUESTIONS,
		});
	});

	it("auto language only goes with extract", () => {
		expect(() =>
			parseGenerationOptions(
				{ ...DEFAULT_GENERATION_OPTIONS, language: "auto" },
				"pdf",
			),
		).toThrow(InvalidGenerationOptionsError);
	});

	it("starts from quiz, Portuguese, intermediate and about 20 questions", () => {
		expect(DEFAULT_GENERATION_OPTIONS).toEqual({
			format: "quiz",
			language: "pt",
			level: "intermediate",
			count: 20,
		});
	});
});

describe("parseStoredGenerationOptions", () => {
	it("reads stored options tolerantly, falling back to the defaults", () => {
		expect(parseStoredGenerationOptions(null)).toEqual(
			DEFAULT_GENERATION_OPTIONS,
		);
		expect(
			parseStoredGenerationOptions({
				format: "trueFalse",
				language: "xx",
				level: "advanced",
				count: 7,
			}),
		).toEqual({
			format: "trueFalse",
			language: "pt",
			level: "advanced",
			count: 20,
		});
	});

	it("never remembers extract or auto", () => {
		expect(
			parseStoredGenerationOptions({
				format: "extract",
				language: "auto",
				level: "beginner",
				count: 5,
			}),
		).toEqual({ format: "quiz", language: "pt", level: "beginner", count: 5 });
	});
});

describe("parseTopicText", () => {
	it("trims the topic", () => {
		expect(parseTopicText("  Sistema solar  ")).toBe("Sistema solar");
	});

	it("rejects blank topics", () => {
		expect(() => parseTopicText("   ")).toThrow(GenerationTopicEmptyError);
	});

	it("rejects topics over 20000 characters", () => {
		expect(GENERATION_TOPIC_MAX_LENGTH).toBe(20_000);
		expect(parseTopicText("a".repeat(20_000))).toHaveLength(20_000);
		expect(() => parseTopicText("a".repeat(20_001))).toThrow(
			GenerationTopicTooLongError,
		);
	});

	it("counts graphemes in the topic", () => {
		expect(parseTopicText("🪐".repeat(20_000))).toHaveLength(40_000);
	});
});

describe("parseSourcePages", () => {
	it("accepts 1 to 50 distinct pages", () => {
		expect(GENERATION_MAX_PAGES).toBe(50);
		expect(parseSourcePages([3, 1])).toEqual([3, 1]);
		const fifty = Array.from({ length: 50 }, (_, index) => index + 1);
		expect(parseSourcePages(fifty)).toEqual(fifty);
		expect(() => parseSourcePages([...fifty, 51])).toThrow(
			InvalidSourcePagesError,
		);
	});

	it.each([[[]], [[1, 1]], [[0]], [[1.5]], [[-2]]])(
		"rejects no pages, repeated pages and page 0: %o",
		(pages) => {
			expect(() => parseSourcePages(pages)).toThrow(InvalidSourcePagesError);
		},
	);
});
