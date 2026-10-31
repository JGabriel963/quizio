import { describe, expect, it } from "vitest";

import { aPuzzleGameQuestion, someChoices } from "../testing/a-game-question";
import type { GameChoice } from "./game-question";
import {
	isRightOrder,
	placedInOrder,
	puzzleTexts,
	wrongOrderOf,
} from "./puzzle";

const backwards = <T>(items: readonly T[]): T[] => [...items].reverse();
const asDrawn = <T>(items: readonly T[]): T[] => [...items];

/** A puzzle whose answers have these texts, right in this order. */
function puzzleOf(texts: string[]) {
	const choices = someChoices(
		texts,
		texts.map((_, index) => index),
	);
	return aPuzzleGameQuestion({
		choices,
		correctOrder: choices.map(({ id }) => id),
	});
}

describe("puzzle (spec 033)", () => {
	const rivers = aPuzzleGameQuestion();

	it("reads the texts in the order of the ids", () => {
		expect(puzzleTexts(rivers, ["choice-3", "choice-1"])).toEqual([
			"Yangtzé",
			"Nilo",
		]);
	});

	it("the right order is right and one swap is wrong", () => {
		expect(
			isRightOrder(rivers, ["choice-1", "choice-2", "choice-3", "choice-4"]),
		).toBe(true);
		expect(
			isRightOrder(rivers, ["choice-1", "choice-2", "choice-4", "choice-3"]),
		).toBe(false);
		expect(isRightOrder(rivers, ["choice-1", "choice-2", "choice-3"])).toBe(
			false,
		);
	});

	it("equal texts are right in either place", () => {
		const ones = puzzleOf(["1", "1", "2"]);

		expect(isRightOrder(ones, ["choice-1", "choice-2", "choice-3"])).toBe(true);
		expect(isRightOrder(ones, ["choice-2", "choice-1", "choice-3"])).toBe(true);
		expect(isRightOrder(ones, ["choice-1", "choice-3", "choice-2"])).toBe(
			false,
		);
	});

	it("a draw that comes out wrong is kept", () => {
		expect(wrongOrderOf(rivers, backwards)).toEqual([
			"choice-4",
			"choice-3",
			"choice-2",
			"choice-1",
		]);
	});

	it("a draw that comes out right is turned by one place", () => {
		expect(wrongOrderOf(rivers, asDrawn)).toEqual([
			"choice-2",
			"choice-3",
			"choice-4",
			"choice-1",
		]);
		const palindrome = puzzleOf(["1", "2", "1"]);
		expect(
			puzzleTexts(palindrome, wrongOrderOf(palindrome, backwards)),
		).toEqual(["2", "1", "1"]);
	});

	it("with equal texts the draw is never a right order", () => {
		const ones = puzzleOf(["1", "1", "2"]);
		for (const shuffle of [asDrawn, backwards]) {
			expect(isRightOrder(ones, wrongOrderOf(ones, shuffle))).toBe(false);
		}
	});

	it("all-equal texts keep the editor's order", () => {
		const same = puzzleOf(["x", "x", "x"]);

		expect(wrongOrderOf(same, backwards)).toEqual([
			"choice-1",
			"choice-2",
			"choice-3",
		]);
	});

	it("placing in an order gives each choice the shape of its place", () => {
		expect(
			placedInOrder(rivers, ["choice-3", "choice-4", "choice-1", "choice-2"]),
		).toEqual([
			{
				id: "choice-3",
				shapeIndex: 0,
				text: "Yangtzé",
				textFormatting: {},
				image: null,
				correct: true,
			},
			{
				id: "choice-4",
				shapeIndex: 1,
				text: "Mississipi",
				textFormatting: {},
				image: null,
				correct: true,
			},
			{
				id: "choice-1",
				shapeIndex: 2,
				text: "Nilo",
				textFormatting: {},
				image: null,
				correct: true,
			},
			{
				id: "choice-2",
				shapeIndex: 3,
				text: "Amazonas",
				textFormatting: {},
				image: null,
				correct: true,
			},
		]);
	});
});

describe("puzzle formatting (spec 048)", () => {
	it("equal texts with different formatting may swap places", () => {
		const choices = someChoices(["Sol", "Lua", "Sol"], [0, 1, 2]).map(
			(entry, index) =>
				index === 0
					? { ...entry, textFormatting: { bold: [[0, 3] as [number, number]] } }
					: entry,
		);
		const question = aPuzzleGameQuestion({
			choices,
			correctOrder: choices.map(({ id }) => id),
		});

		expect(isRightOrder(question, ["choice-3", "choice-2", "choice-1"])).toBe(
			true,
		);
	});
});

describe("puzzle with image answers (spec 049, RN-20)", () => {
	const imageOf = (key: string) => ({ key, crop: null, altText: null });

	function withImages(choices: GameChoice[], images: (string | null)[]) {
		return choices.map((choice, index) => {
			const key = images[index];
			return key ? { ...choice, text: null, image: imageOf(key) } : choice;
		});
	}

	it("two image answers are never the same answer, nor an image the same as a text", () => {
		const choices = withImages(someChoices(["", "", "Nilo"], [0, 1, 2]), [
			"media/a.png",
			"media/b.png",
			null,
		]);
		const puzzle = aPuzzleGameQuestion({
			choices,
			correctOrder: choices.map(({ id }) => id),
		});

		expect(isRightOrder(puzzle, ["choice-1", "choice-2", "choice-3"])).toBe(
			true,
		);
		expect(isRightOrder(puzzle, ["choice-2", "choice-1", "choice-3"])).toBe(
			false,
		);
		expect(isRightOrder(puzzle, ["choice-3", "choice-2", "choice-1"])).toBe(
			false,
		);
		expect(wrongOrderOf(puzzle, asDrawn)).not.toEqual(puzzle.correctOrder);
	});

	it("the same picture twice may swap places, like equal texts", () => {
		const choices = withImages(someChoices(["", "", "Nilo"], [0, 1, 2]), [
			"media/a.png",
			"media/a.png",
			null,
		]);
		const puzzle = aPuzzleGameQuestion({
			choices,
			correctOrder: choices.map(({ id }) => id),
		});

		expect(isRightOrder(puzzle, ["choice-2", "choice-1", "choice-3"])).toBe(
			true,
		);
	});
});
