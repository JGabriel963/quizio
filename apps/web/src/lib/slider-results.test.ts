import { describe, expect, it } from "vitest";

import {
	clampStripOffset,
	columnAtCenter,
	sliderColumns,
	stripOffsetFor,
} from "./slider-results";

describe("sliderColumns (spec 032, RN-31)", () => {
	it("builds one column per position with its count, color and height", () => {
		const columns = sliderColumns(
			{ first: 104, last: 896, step: 8 },
			{
				answer: 600,
				low: 520,
				high: 680,
				counts: [
					{ value: 104, count: 1 },
					{ value: 600, count: 4 },
					{ value: 640, count: 2 },
				],
			},
		);

		expect(columns).toHaveLength(100);
		expect(columns[0]).toMatchObject({
			value: 104,
			count: 1,
			kind: "outside",
			height: 0.25,
		});
		expect(columns.find(({ value }) => value === 600)).toMatchObject({
			count: 4,
			kind: "answer",
			height: 1,
			marked: false,
		});
		expect(columns.find(({ value }) => value === 640)).toMatchObject({
			kind: "margin",
			height: 0.5,
		});
		expect(columns.find(({ value }) => value === 520)?.kind).toBe("margin");
		expect(columns.find(({ value }) => value === 512)?.kind).toBe("outside");
		expect(columns.at(-1)).toMatchObject({ value: 896, count: 0, height: 0 });
	});

	it("marks every tenth position from the answer, as in Kahoot", () => {
		const marked = sliderColumns(
			{ first: 460, last: 510, step: 1 },
			{ answer: 500, low: 495, high: 505, counts: [] },
		)
			.filter((column) => column.marked)
			.map(({ value }) => value);

		expect(marked).toEqual([460, 470, 480, 490, 510]);
	});
});

describe("the results' card offset (spec 032, RN-31)", () => {
	const layout = {
		viewWidth: 1000,
		columnCount: 51,
		columnWidth: 36,
		padding: 24,
	};

	it("puts the chosen column in the middle", () => {
		// Column 40's center is 24 + 40 × 36 + 18 = 1482.
		expect(stripOffsetFor({ ...layout, index: 40 })).toBe(500 - 1482);
	});

	it("never moves an end of the scale past the middle", () => {
		expect(stripOffsetFor({ ...layout, index: 0 })).toBe(500 - 42);
		expect(clampStripOffset(10_000, layout)).toBe(500 - 42);
		expect(clampStripOffset(-10_000, layout)).toBe(500 - (24 + 50 * 36 + 18));
	});
});

describe("the column in the middle (spec 032, RN-31)", () => {
	const layout = {
		viewWidth: 1000,
		columnCount: 51,
		columnWidth: 36,
		padding: 24,
	};

	it("is the one whose offset centers it, and the nearest one in between", () => {
		const at40 = stripOffsetFor({ ...layout, index: 40 });
		expect(columnAtCenter(at40, layout)).toBe(40);
		expect(columnAtCenter(at40 - 17, layout)).toBe(40);
		expect(columnAtCenter(at40 - 19, layout)).toBe(41);
		expect(columnAtCenter(10_000, layout)).toBe(0);
		expect(columnAtCenter(-10_000, layout)).toBe(50);
	});
});
