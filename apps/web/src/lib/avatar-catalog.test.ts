import { ACCESSORY_IDS, CHARACTER_IDS } from "@quizio/core/game/domain/avatar";
import { describe, expect, it } from "vitest";

import { AVATAR_CATALOG, accessoryOf, characterOf } from "./avatar-catalog";

describe("avatar catalog (spec 028)", () => {
	it("has the same ids as the core, in the same order", () => {
		expect(AVATAR_CATALOG.characters.map((item) => item.id)).toEqual([
			...CHARACTER_IDS,
		]);
		expect(AVATAR_CATALOG.accessories.map((item) => item.id)).toEqual([
			...ACCESSORY_IDS,
		]);
	});

	it("every item has a label and an image path", () => {
		for (const item of [
			...AVATAR_CATALOG.characters,
			...AVATAR_CATALOG.accessories,
		]) {
			expect(item.label.length).toBeGreaterThan(0);
			expect(item.src).toMatch(
				/^\/avatars\/(characters|accessories)\/[a-z-]+\.svg$/,
			);
		}
		expect(
			new Set(AVATAR_CATALOG.characters.map((item) => item.label)).size,
		).toBe(CHARACTER_IDS.length);
	});

	it("finds an item by id", () => {
		expect(characterOf("koala").label).toBe("Coala");
		expect(accessoryOf("top-hat").label).toBe("Cartola");
	});
});
