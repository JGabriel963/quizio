import { parseJoinPin } from "@quizio/core/game/domain/game-pin";
import { describe, expect, it } from "vitest";

import { createRandomAssignmentPinGenerator } from "./random-assignment-pin-generator";

describe("createRandomAssignmentPinGenerator (spec 029)", () => {
	it("draws eight digits that vary", () => {
		const pins = createRandomAssignmentPinGenerator();

		const drawn = Array.from({ length: 50 }, () => pins.generate());

		for (const pin of drawn) {
			expect(parseJoinPin(pin)).toEqual({ pin, mode: "assignment" });
		}
		expect(new Set(drawn).size).toBeGreaterThan(40);
	});

	it("may start with zero", () => {
		const pins = createRandomAssignmentPinGenerator(() => 4_352_236);

		expect(pins.generate()).toBe("04352236");
	});
});
