import { describe, expect, it } from "vitest";

import { FixedShuffler } from "../../shared/testing/fixed-shuffler";
import {
	ACCESSORY_IDS,
	CHARACTER_IDS,
	drawAvatar,
	knownAvatar,
	parseAvatar,
	UnknownAvatarError,
} from "./avatar";

describe("avatar (spec 028)", () => {
	it("accepts a character and an accessory from the catalog", () => {
		expect(parseAvatar({ character: "koala", accessory: "top-hat" })).toEqual({
			character: "koala",
			accessory: "top-hat",
		});
	});

	it("accepts no accessory", () => {
		expect(parseAvatar({ character: "koala", accessory: null })).toEqual({
			character: "koala",
			accessory: null,
		});
	});

	it("rejects an unknown character", () => {
		expect(() =>
			parseAvatar({ character: "dinosaur", accessory: null }),
		).toThrow(UnknownAvatarError);
	});

	it("rejects an unknown accessory", () => {
		expect(() =>
			parseAvatar({ character: "koala", accessory: "jetpack" }),
		).toThrow(UnknownAvatarError);
	});

	it("knownAvatar is null for an id that left the catalog", () => {
		expect(knownAvatar({ character: "dinosaur", accessory: null })).toBeNull();
		expect(
			knownAvatar({ character: "koala", accessory: "jetpack" }),
		).toBeNull();
		expect(knownAvatar(null)).toBeNull();
		expect(knownAvatar({ character: "fox", accessory: "crown" })).toEqual({
			character: "fox",
			accessory: "crown",
		});
	});

	it("draws a character and an accessory with the shuffler", () => {
		const shuffler = new FixedShuffler();

		expect(drawAvatar(shuffler)).toEqual({
			character: CHARACTER_IDS[CHARACTER_IDS.length - 1],
			accessory: ACCESSORY_IDS[ACCESSORY_IDS.length - 1],
		});
		expect(shuffler.calls).toBe(2);
	});

	it("the catalog has at least 24 characters and 24 accessories, without repeats", () => {
		expect(CHARACTER_IDS.length).toBeGreaterThanOrEqual(24);
		expect(ACCESSORY_IDS.length).toBeGreaterThanOrEqual(24);
		expect(new Set(CHARACTER_IDS).size).toBe(CHARACTER_IDS.length);
		expect(new Set(ACCESSORY_IDS).size).toBe(ACCESSORY_IDS.length);
	});
});
