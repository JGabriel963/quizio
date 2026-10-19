import { randomInt } from "node:crypto";

import type { AssignmentPinGenerator } from "@quizio/core/game/application/ports/assignment-pin-generator";

/** Eight digits from 00000000 to 99999999, drawn (spec 029, RN-18). */
export function createRandomAssignmentPinGenerator(
	draw: () => number = () => randomInt(0, 100_000_000),
): AssignmentPinGenerator {
	return { generate: () => String(draw()).padStart(8, "0") };
}
