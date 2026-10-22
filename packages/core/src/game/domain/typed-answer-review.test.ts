import { describe, expect, it } from "vitest";

import type { TypedAnswerGroup } from "../../shared/domain/typed-answer";
import {
	AnswerNotReviewableError,
	isSimilarAnswer,
	parseReviewChanges,
	REVEAL_TAG_LIMIT,
	revealTags,
} from "./typed-answer-review";

const group = (
	text: string,
	count: number,
	overrides: Partial<TypedAnswerGroup> = {},
): TypedAnswerGroup => ({
	key: text.toLowerCase(),
	text,
	count,
	correct: false,
	accepted: false,
	...overrides,
});

describe("isSimilarAnswer (spec 031, RN-28)", () => {
	it("Pedra is similar to Pedro", () => {
		expect(isSimilarAnswer("pedra", ["pedro"])).toBe(true);
		expect(
			isSimilarAnswer("the coloseum", ["colosseum", "the colosseum"]),
		).toBe(true);
	});

	it("Paulo is not similar to Pedro", () => {
		expect(isSimilarAnswer("paulo", ["pedro"])).toBe(false);
	});

	it("answers under 4 characters are never similar", () => {
		expect(isSimilarAnswer("ana", ["ama"])).toBe(false);
	});

	it("an answer is not similar to itself", () => {
		expect(isSimilarAnswer("pedro", ["pedro"])).toBe(false);
	});
});

describe("revealTags (spec 031, RN-23, RN-23a)", () => {
	it("the reveal has every correct tag and the most sent wrong ones, 12 in all", () => {
		const correct = [
			group("Pedro", 3, { correct: true, accepted: true }),
			group("Simão", 0, { correct: true, accepted: true }),
		];
		const wrong = Array.from({ length: 30 }, (_, index) =>
			group(`Errada ${index}`, 30 - index),
		);

		const tags = revealTags([...correct, ...wrong]);

		expect(tags).toHaveLength(REVEAL_TAG_LIMIT);
		expect(tags.slice(0, 2)).toEqual(correct);
		expect(tags.slice(2).map((tag) => tag.text)).toEqual(
			wrong.slice(0, 10).map((tag) => tag.text),
		);
	});
});

describe("parseReviewChanges (spec 031, RN-29)", () => {
	const groups = [
		group("Pedro", 1, { correct: true, accepted: true }),
		group("Pedra", 2),
		group("Tiago", 1),
	];

	it("refuses changing an accepted answer", () => {
		expect(() =>
			parseReviewChanges(groups, [{ key: "pedro", correct: false }]),
		).toThrow(AnswerNotReviewableError);
	});

	it("refuses a key nobody sent", () => {
		expect(() =>
			parseReviewChanges(groups, [{ key: "joao", correct: true }]),
		).toThrow(AnswerNotReviewableError);
	});

	it("keeps the changes to sent answers that change something", () => {
		expect(
			parseReviewChanges(groups, [
				{ key: "pedra", correct: true },
				{ key: "tiago", correct: false },
			]),
		).toEqual([{ key: "pedra", correct: true }]);
	});
});
