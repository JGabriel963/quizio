import { describe, expect, it } from "vitest";

import { aReportQuestion } from "../testing/a-report-game";
import { puzzleAnswersOf, puzzleOrderOf } from "./puzzle-orders";

/** The rivers, drawn backwards: Mississipi took the triangle. */
const puzzle = aReportQuestion(0, {
	type: "puzzle",
	choices: [
		{ id: "c4", shapeIndex: 0, text: "Mississipi", correct: true },
		{ id: "c3", shapeIndex: 1, text: "Yangtzé", correct: true },
		{ id: "c2", shapeIndex: 2, text: "Amazonas", correct: true },
		{ id: "c1", shapeIndex: 3, text: "Nilo", correct: true },
	],
	correctOrder: ["c1", "c2", "c3", "c4"],
});
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
				{ text: "Nilo", shapeIndex: 3 },
				{ text: "Amazonas", shapeIndex: 2 },
				{ text: "Yangtzé", shapeIndex: 1 },
				{ text: "Mississipi", shapeIndex: 0 },
			],
			orders: [
				{
					texts: ["Nilo", "Amazonas", "Yangtzé", "Mississipi"],
					count: 1,
					correct: true,
				},
				{
					texts: ["Nilo", "Amazonas", "Mississipi", "Yangtzé"],
					count: 2,
					correct: false,
				},
				{
					texts: ["Mississipi", "Yangtzé", "Amazonas", "Nilo"],
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
				{ id: "a", shapeIndex: 0, text: "1", correct: true },
				{ id: "b", shapeIndex: 1, text: "1", correct: true },
				{ id: "c", shapeIndex: 2, text: "2", correct: true },
			],
			correctOrder: ["a", "b", "c"],
		});

		expect(
			puzzleAnswersOf(ones, [
				sent(["a", "b", "c"], true),
				sent(["b", "a", "c"], true),
			])?.orders,
		).toEqual([{ texts: ["1", "1", "2"], count: 2, correct: true }]);
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
		).toEqual(["Amazonas", "Nilo", "Yangtzé", "Mississipi"]);
		expect(puzzleOrderOf(puzzle, undefined)).toBeNull();
	});
});
