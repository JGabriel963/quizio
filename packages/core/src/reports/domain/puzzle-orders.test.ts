import { describe, expect, it } from "vitest";

import { aReportQuestion } from "../testing/a-report-game";
import { puzzleAnswersOf, puzzleOrderOf } from "./puzzle-orders";

/** The rivers, drawn backwards: Mississipi took the triangle. */
const puzzle = aReportQuestion(0, {
	type: "puzzle",
	choices: [
		{
			id: "c4",
			shapeIndex: 0,
			text: "Mississipi",
			textFormatting: {},
			image: null,
			correct: true,
		},
		{
			id: "c3",
			shapeIndex: 1,
			text: "Yangtzé",
			textFormatting: {},
			image: null,
			correct: true,
		},
		{
			id: "c2",
			shapeIndex: 2,
			text: "Amazonas",
			textFormatting: {},
			image: null,
			correct: true,
		},
		{
			id: "c1",
			shapeIndex: 3,
			text: "Nilo",
			textFormatting: {},
			image: null,
			correct: true,
		},
	],
	correctOrder: ["c1", "c2", "c3", "c4"],
});
/** Answers without formatting, as most reports have them. */
const plain = (texts: string[]) =>
	texts.map((text) => ({ text, textFormatting: {}, image: null }));
const sent = (choiceIds: string[], correct: boolean) => ({
	choiceIds,
	correctness: correct ? ("correct" as const) : ("wrong" as const),
});

describe("puzzle orders in a report (spec 033, RN-31)", () => {
	it("groups sent orders by their texts, the right one first, then by count", () => {
		const view = puzzleAnswersOf(puzzle, [
			sent(["c1", "c2", "c4", "c3"], false),
			sent(["c4", "c3", "c2", "c1"], false),
			sent(["c1", "c2", "c4", "c3"], false),
			sent(["c1", "c2", "c3", "c4"], true),
		]);

		expect(view).toEqual({
			correctOrder: [
				{ text: "Nilo", textFormatting: {}, image: null, shapeIndex: 3 },
				{ text: "Amazonas", textFormatting: {}, image: null, shapeIndex: 2 },
				{ text: "Yangtzé", textFormatting: {}, image: null, shapeIndex: 1 },
				{ text: "Mississipi", textFormatting: {}, image: null, shapeIndex: 0 },
			],
			orders: [
				{
					answers: plain(["Nilo", "Amazonas", "Yangtzé", "Mississipi"]),
					count: 1,
					correct: true,
				},
				{
					answers: plain(["Nilo", "Amazonas", "Mississipi", "Yangtzé"]),
					count: 2,
					correct: false,
				},
				{
					answers: plain(["Mississipi", "Yangtzé", "Amazonas", "Nilo"]),
					count: 1,
					correct: false,
				},
			],
		});
	});

	it("orders of equal texts are one order", () => {
		const ones = aReportQuestion(0, {
			type: "puzzle",
			choices: [
				{
					id: "a",
					shapeIndex: 0,
					text: "1",
					textFormatting: {},
					image: null,
					correct: true,
				},
				{
					id: "b",
					shapeIndex: 1,
					text: "1",
					textFormatting: {},
					image: null,
					correct: true,
				},
				{
					id: "c",
					shapeIndex: 2,
					text: "2",
					textFormatting: {},
					image: null,
					correct: true,
				},
			],
			correctOrder: ["a", "b", "c"],
		});

		expect(
			puzzleAnswersOf(ones, [
				sent(["a", "b", "c"], true),
				sent(["b", "a", "c"], true),
			])?.orders,
		).toEqual([{ answers: plain(["1", "1", "2"]), count: 2, correct: true }]);
	});

	it("other types have no orders", () => {
		expect(puzzleAnswersOf(aReportQuestion(0), [])).toBeNull();
		expect(
			puzzleOrderOf(aReportQuestion(0), {
				choiceIds: ["q0-a"],
			}),
		).toBeNull();
	});

	it("a participant's order is the texts they sent", () => {
		expect(
			puzzleOrderOf(puzzle, { choiceIds: ["c2", "c1", "c3", "c4"] }),
		).toEqual(plain(["Amazonas", "Nilo", "Yangtzé", "Mississipi"]));
		expect(puzzleOrderOf(puzzle, undefined)).toBeNull();
	});
});

describe("formatted puzzle orders (spec 048, RN-19)", () => {
	const subscript2 = { subscript: [[1, 2] as [number, number]] };
	const chemistry = aReportQuestion(0, {
		type: "puzzle",
		choices: [
			{
				id: "w",
				shapeIndex: 0,
				text: "Sal",
				textFormatting: {},
				image: null,
				correct: true,
			},
			{
				id: "h",
				shapeIndex: 1,
				text: "H2O",
				textFormatting: subscript2,
				image: null,
				correct: true,
			},
			{
				id: "s",
				shapeIndex: 2,
				text: "Sol",
				textFormatting: { bold: [[0, 3]] },
				image: null,
				correct: true,
			},
			{
				id: "t",
				shapeIndex: 3,
				text: "Sol",
				textFormatting: {},
				image: null,
				correct: true,
			},
		],
		correctOrder: ["h", "s", "t", "w"],
	});

	it("the right order is formatted", () => {
		expect(puzzleAnswersOf(chemistry, [])?.correctOrder).toEqual([
			{ text: "H2O", textFormatting: subscript2, image: null, shapeIndex: 1 },
			{
				text: "Sol",
				textFormatting: { bold: [[0, 3]] },
				image: null,
				shapeIndex: 2,
			},
			{ text: "Sol", textFormatting: {}, image: null, shapeIndex: 3 },
			{ text: "Sal", textFormatting: {}, image: null, shapeIndex: 0 },
		]);
	});

	it("orders keep each answer's formatting, grouped by text", () => {
		const orders = puzzleAnswersOf(chemistry, [
			sent(["h", "s", "t", "w"], true),
			sent(["h", "t", "s", "w"], true),
		])?.orders;

		expect(orders).toEqual([
			{
				answers: [
					{ text: "H2O", textFormatting: subscript2, image: null },
					{ text: "Sol", textFormatting: { bold: [[0, 3]] }, image: null },
					{ text: "Sol", textFormatting: {}, image: null },
					{ text: "Sal", textFormatting: {}, image: null },
				],
				count: 2,
				correct: true,
			},
		]);
	});

	it("a participant's order is formatted", () => {
		expect(
			puzzleOrderOf(chemistry, { choiceIds: ["w", "h", "s", "t"] }),
		).toEqual([
			{ text: "Sal", textFormatting: {}, image: null },
			{ text: "H2O", textFormatting: subscript2, image: null },
			{ text: "Sol", textFormatting: { bold: [[0, 3]] }, image: null },
			{ text: "Sol", textFormatting: {}, image: null },
		]);
	});
});

describe("puzzle orders with image answers (spec 049, RN-24)", () => {
	const imageOf = (key: string) => ({ key, crop: null, altText: key });
	const pictures = aReportQuestion(0, {
		type: "puzzle",
		choices: [
			{
				id: "a",
				shapeIndex: 0,
				text: null,
				textFormatting: {},
				image: imageOf("media/a.png"),
				correct: true,
			},
			{
				id: "b",
				shapeIndex: 1,
				text: null,
				textFormatting: {},
				image: imageOf("media/b.png"),
				correct: true,
			},
			{
				id: "c",
				shapeIndex: 2,
				text: "Nilo",
				textFormatting: {},
				image: null,
				correct: true,
			},
		],
		correctOrder: ["a", "b", "c"],
	});

	it("orders group by answer identity, with image answers apart", () => {
		const view = puzzleAnswersOf(pictures, [
			sent(["a", "b", "c"], true),
			sent(["b", "a", "c"], false),
			sent(["b", "a", "c"], false),
		]);

		expect(
			view?.orders.map(({ count, correct }) => ({ count, correct })),
		).toEqual([
			{ count: 1, correct: true },
			{ count: 2, correct: false },
		]);
	});

	it("an ordered image answer carries its image, without an address by default", () => {
		expect(puzzleOrderOf(pictures, { choiceIds: ["a", "c"] })).toEqual([
			{
				text: null,
				textFormatting: {},
				image: { url: null, crop: null, altText: "media/a.png" },
			},
			{ text: "Nilo", textFormatting: {}, image: null },
		]);
		expect(
			puzzleOrderOf(pictures, { choiceIds: ["a"] }, (image) => ({
				url: `https://media.test/${image.key}`,
				crop: image.crop,
				altText: image.altText,
			}))?.[0]?.image?.url,
		).toBe("https://media.test/media/a.png");
	});
});
