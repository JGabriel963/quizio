import { randomInt } from "node:crypto";

import type { Shuffler } from "@quizio/core/shared/application/ports/shuffler";

/** Fisher-Yates over a copy: the order of a game's questions and answers (spec 012). */
export function createRandomShuffler(): Shuffler {
	return {
		shuffle<T>(items: readonly T[]): T[] {
			const shuffled = [...items];
			for (let last = shuffled.length - 1; last > 0; last--) {
				const picked = randomInt(last + 1);
				const moved = shuffled[last] as T;
				shuffled[last] = shuffled[picked] as T;
				shuffled[picked] = moved;
			}
			return shuffled;
		},
	};
}
