import {
	PODIUM_REVEAL_MS,
	PODIUM_REVEAL_TOTAL_MS,
} from "@quizio/core/game/domain/podium";

import type { FinalStandingData } from "./api-types";

export type PodiumPlace = 1 | 2 | 3;

/** The steps as they stand side by side: the first in the middle (spec 011, RN-08). */
const STEP_ORDER: readonly PodiumPlace[] = [2, 1, 3];

/**
 * Which places already show when the reveal has `remainingMs` left: the
 * third, then the second, then the first (RN-10). The server says how much is
 * left, so a reload goes on from where the reveal is (RN-11).
 */
export function revealedPlaces(remainingMs: number): PodiumPlace[] {
	const elapsed = PODIUM_REVEAL_TOTAL_MS - remainingMs;
	return STEP_ORDER.filter((place) => elapsed >= PODIUM_REVEAL_MS[place]);
}

/** The first three on their steps; a step nobody reached stays empty (RN-09). */
export function podiumOf(
	standings: readonly FinalStandingData[],
): { place: PodiumPlace; standing: FinalStandingData | null }[] {
	return STEP_ORDER.map((place) => ({
		place,
		standing: standings.find((standing) => standing.rank === place) ?? null,
	}));
}
