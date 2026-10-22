import { describe, expect, it } from "vitest";

import { blockAnnouncements, moveBlock } from "./sortable";

const blocks = [
	{ id: "a", label: "Nilo" },
	{ id: "b", label: "Amazonas" },
	{ id: "c", label: "Yangtzé" },
	{ id: "d", label: "Mississipi" },
];
const event = (activeId: string, overId: string | null) =>
	({
		active: { id: activeId },
		over: overId === null ? null : { id: overId },
	}) as never;

describe("sortable blocks (spec 033, RN-32)", () => {
	it("announces pick, move and drop with the position out of the total", () => {
		const announce = blockAnnouncements(blocks);

		expect(announce.onDragStart(event("b", null))).toBe(
			"Amazonas pego, posição 2 de 4.",
		);
		expect(announce.onDragOver(event("b", "d"))).toBe(
			"Amazonas sobre a posição 4 de 4.",
		);
		expect(announce.onDragEnd(event("b", "d"))).toBe(
			"Amazonas solto na posição 4 de 4.",
		);
		expect(announce.onDragCancel(event("b", null))).toBe(
			"Movimento cancelado. Amazonas voltou à posição 2 de 4.",
		);
	});

	it("names a block without text by its position", () => {
		const shapes = blocks.map(({ id }) => ({ id, label: null }));

		expect(blockAnnouncements(shapes).onDragStart(event("c", null))).toBe(
			"Bloco 3 pego, posição 3 de 4.",
		);
	});

	it("moving a block takes it to the other's place and shifts the ones between", () => {
		expect(moveBlock(["a", "b", "c", "d"], "c", "a")).toEqual([
			"c",
			"a",
			"b",
			"d",
		]);
		expect(moveBlock(["a", "b", "c", "d"], "a", "d")).toEqual([
			"b",
			"c",
			"d",
			"a",
		]);
		expect(moveBlock(["a", "b"], "a", "x")).toEqual(["a", "b"]);
	});
});
