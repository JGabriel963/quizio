import { SCOREBOARD_SIZE } from "@quizio/core/game/domain/standings";

import type { ScoreboardEntryData } from "./api-types";

/** A row of the scoreboard at one step of its animation. */
export interface ScoreboardRow {
	playerId: string;
	nickname: string;
	/** What the row's total counts up from. */
	fromTotal: number;
	total: number;
	/** The arrow of who went up (spec 010, RN-20): only once the row has arrived. */
	climbed: boolean;
}

/**
 * The scoreboard's animation (spec 011, RN-28 to RN-32): it opens with the
 * rows of `before`, their totals count up, then the list becomes `after`,
 * which is the scoreboard of spec 010. Rows keep their identity across the
 * two, so the ones in both slide, new ones come in and the others leave.
 */
export interface ScoreboardSteps {
	before: ScoreboardRow[];
	after: ScoreboardRow[];
	/** False when there is nothing to animate: the scoreboard shows still (RN-32). */
	changed: boolean;
	/**
	 * Whether a row of `before` has points to count up. When only who comes in
	 * scored, there is nothing to watch before the rows move.
	 */
	counts: boolean;
}

export function scoreboardSteps(
	entries: readonly ScoreboardEntryData[],
	leavers: readonly ScoreboardEntryData[],
): ScoreboardSteps {
	const after = entries.map((entry) => ({
		playerId: entry.playerId,
		nickname: entry.nickname,
		fromTotal: entry.previous?.total ?? 0,
		total: entry.total,
		climbed: entry.climbed,
	}));

	// The first question's scoreboard has no "before": same rows, from zero.
	const isFirst = entries.every((entry) => entry.previous === null);
	const shownBefore = isFirst
		? entries.map((entry, index) => ({ entry, rank: index + 1 }))
		: [...entries, ...leavers]
				.flatMap((entry) =>
					entry.previous && entry.previous.rank <= SCOREBOARD_SIZE
						? [{ entry, rank: entry.previous.rank }]
						: [],
				)
				.sort((a, b) => a.rank - b.rank);
	const before = shownBefore.map(({ entry }) => ({
		playerId: entry.playerId,
		nickname: entry.nickname,
		fromTotal: entry.previous?.total ?? 0,
		total: entry.total,
		climbed: false,
	}));

	const sameOrder =
		before.length === after.length &&
		before.every((row, index) => row.playerId === after[index]?.playerId);
	const changed =
		!sameOrder || after.some((row) => row.fromTotal !== row.total);

	return {
		before: changed ? before : after,
		after,
		changed,
		counts: changed && before.some((row) => row.fromTotal !== row.total),
	};
}
