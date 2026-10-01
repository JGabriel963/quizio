import type { Answer } from "./answer";

/** How many players the scoreboard shows (spec 010, RN-18). */
export const SCOREBOARD_SIZE = 5;

/** A player's place in the game by total of points. */
export interface Standing {
	playerId: string;
	nickname: string;
	total: number;
	/** 1-based; no two players share one (RN-19). */
	rank: number;
}

export interface ScoreboardEntry extends Standing {
	/** Went up since the previous question's scoreboard (RN-20). */
	climbed: boolean;
}

/** A player's own place, and who is right ahead (RN-15). */
export interface PlayerStanding {
	rank: number;
	total: number;
	/** Null for the first. */
	behind: { nickname: string; points: number } | null;
}

/**
 * Everybody in the game by total, the highest first. `players` comes in order
 * of arrival, which is what settles a tie (RN-19); who has no points yet has
 * zero (RN-08). Totals of who is not in `players` are left out.
 */
export function rankPlayers(
	players: readonly { id: string; nickname: string }[],
	totals: readonly { playerId: string; total: number }[],
): Standing[] {
	const totalOf = new Map(
		totals.map(({ playerId, total }) => [playerId, total]),
	);
	return players
		.map((player, arrival) => ({
			playerId: player.id,
			nickname: player.nickname,
			total: totalOf.get(player.id) ?? 0,
			arrival,
		}))
		.sort((a, b) => b.total - a.total || a.arrival - b.arrival)
		.map(({ arrival: _arrival, ...standing }, index) => ({
			...standing,
			rank: index + 1,
		}));
}

/**
 * The top of the standings, with who climbed since `previous`, the standings
 * of the question before; null for the first question (RN-18, RN-20).
 */
export function scoreboardOf(
	current: readonly Standing[],
	previous: readonly Standing[] | null,
): ScoreboardEntry[] {
	const previousRank = new Map(
		previous?.map((standing) => [standing.playerId, standing.rank]),
	);
	return current.slice(0, SCOREBOARD_SIZE).map((standing) => ({
		...standing,
		climbed: standing.rank < (previousRank.get(standing.playerId) ?? 0),
	}));
}

/**
 * How many questions in a row, ending at `questionIndex`, the player got
 * right or partially right. A wrong answer or no answer breaks it (RN-10).
 */
export function streakAfter(
	answers: readonly Pick<Answer, "questionIndex" | "correctness">[],
	questionIndex: number,
): number {
	const byQuestion = new Map(
		answers.map((answer) => [answer.questionIndex, answer.correctness]),
	);
	let streak = 0;
	for (let index = questionIndex; index >= 0; index--) {
		const correctness = byQuestion.get(index);
		if (correctness !== "correct" && correctness !== "partiallyCorrect") {
			break;
		}
		streak++;
	}
	return streak;
}

export function standingOf(
	standings: readonly Standing[],
	playerId: string,
): PlayerStanding | null {
	const index = standings.findIndex(
		(standing) => standing.playerId === playerId,
	);
	const own = standings[index];
	if (!own) {
		return null;
	}
	const ahead = standings[index - 1];
	return {
		rank: own.rank,
		total: own.total,
		behind: ahead
			? { nickname: ahead.nickname, points: ahead.total - own.total }
			: null,
	};
}
