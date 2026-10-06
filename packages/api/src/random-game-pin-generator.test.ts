import { parseGamePin } from "@quizio/core/game/domain/game-pin";
import { describe, expect, it } from "vitest";

import { createRandomGamePinGenerator } from "./random-game-pin-generator";

describe("createRandomGamePinGenerator", () => {
	it("draws valid PINs that vary", () => {
		const pins = createRandomGamePinGenerator();

		const drawn = Array.from({ length: 50 }, () => pins.generate());

		for (const pin of drawn) {
			expect(parseGamePin(pin)).toBe(pin);
		}
		expect(new Set(drawn).size).toBeGreaterThan(40);
	});
});
