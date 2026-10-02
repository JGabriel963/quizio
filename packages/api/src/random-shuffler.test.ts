import { describe, expect, it } from "vitest";

import { createRandomShuffler } from "./random-shuffler";

describe("createRandomShuffler", () => {
	const items = Array.from({ length: 10 }, (_, index) => `item-${index}`);

	it("keeps every item exactly once", () => {
		const shuffled = createRandomShuffler().shuffle(items);

		expect(shuffled).toHaveLength(items.length);
		expect([...shuffled].sort()).toEqual([...items].sort());
	});

	it("does not change the list it was given", () => {
		const given = [...items];

		createRandomShuffler().shuffle(given);

		expect(given).toEqual(items);
	});

	it("draws orders that vary", () => {
		const shuffler = createRandomShuffler();

		const orders = new Set(
			Array.from({ length: 20 }, () => shuffler.shuffle(items).join()),
		);

		// Ten items have 3 628 800 orders: twenty equal draws would be a broken draw.
		expect(orders.size).toBeGreaterThan(15);
	});

	it("takes an empty list and a single item", () => {
		const shuffler = createRandomShuffler();

		expect(shuffler.shuffle([])).toEqual([]);
		expect(shuffler.shuffle(["only"])).toEqual(["only"]);
	});
});
