import { describe, expect, it } from "vitest";

import { gridMoveTarget } from "./symbol-grid";

describe("gridMoveTarget (spec 047, RN-17)", () => {
	// 23 symbols in rows of 10: the last row has 3.
	const move = (index: number, key: string) =>
		gridMoveTarget(index, key, 10, 23);

	it("arrows move by one and by a row", () => {
		expect(move(4, "ArrowRight")).toBe(5);
		expect(move(4, "ArrowLeft")).toBe(3);
		expect(move(4, "ArrowDown")).toBe(14);
		expect(move(14, "ArrowUp")).toBe(4);
	});

	it("Home and End go to the ends", () => {
		expect(move(12, "Home")).toBe(0);
		expect(move(12, "End")).toBe(22);
	});

	it("never leaves the grid", () => {
		expect(move(0, "ArrowLeft")).toBe(0);
		expect(move(22, "ArrowRight")).toBe(22);
		expect(move(3, "ArrowUp")).toBe(3);
		// Below the 16th there is nothing: it stays.
		expect(move(15, "ArrowDown")).toBe(15);
	});

	it("other keys are not a move", () => {
		expect(move(4, "Enter")).toBeNull();
		expect(move(4, "a")).toBeNull();
	});
});
