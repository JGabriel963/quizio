import { randomInt } from "node:crypto";

import type { GamePinGenerator } from "@quizio/core/game/application/ports/game-pin-generator";

/** Six digits from 100000 to 999999: drawn, never sequential (spec 008, RN-09). */
export function createRandomGamePinGenerator(): GamePinGenerator {
	return { generate: () => String(randomInt(100_000, 1_000_000)) };
}
