import { DomainError } from "../../shared/domain/domain-error";

export const BASE_QUESTION_POINTS = 1000;

/** Correct answers faster than this always earn the full points. */
export const FULL_POINTS_WINDOW_MS = 500;

export const POINTS_MULTIPLIERS = {
	noPoints: 0,
	standard: 1,
	double: 2,
} as const;

export type PointsMultiplier = keyof typeof POINTS_MULTIPLIERS;

export class InvalidResponseTimeError extends DomainError {
	readonly code = "GAME.INVALID_RESPONSE_TIME";
}

export interface AnswerScoreInput {
	isCorrect: boolean;
	/** Time between the answer window opening and the server receiving the answer. */
	responseTimeMs: number;
	timeLimitMs: number;
	pointsMultiplier: PointsMultiplier;
}

/**
 * Kahoot's speed-based scoring: a correct answer is worth the question's
 * possible points, decaying linearly to half of them at the time limit.
 *
 *   points = round((1 - (responseTime / timeLimit) / 2) * pointsPossible)
 *
 * Answers within the first 500ms earn full points. Answer streaks award no
 * points (Kahoot removed the streak bonus in 2020); they are display-only.
 * Source: specs/product/kahoot-reference.md, section 5.
 *
 * Accepting or rejecting late answers is the live game's decision, so a
 * response time outside [0, timeLimit] is an invariant violation here.
 */
export function calculateAnswerScore({
	isCorrect,
	responseTimeMs,
	timeLimitMs,
	pointsMultiplier,
}: AnswerScoreInput): number {
	if (timeLimitMs <= 0) {
		throw new InvalidResponseTimeError(
			`Time limit must be positive, received ${timeLimitMs}ms`,
		);
	}
	if (responseTimeMs < 0 || responseTimeMs > timeLimitMs) {
		throw new InvalidResponseTimeError(
			`Response time ${responseTimeMs}ms is outside the ${timeLimitMs}ms answer window`,
		);
	}
	if (!isCorrect) {
		return 0;
	}

	const pointsPossible =
		BASE_QUESTION_POINTS * POINTS_MULTIPLIERS[pointsMultiplier];
	if (responseTimeMs < FULL_POINTS_WINDOW_MS) {
		return pointsPossible;
	}
	return Math.round((1 - responseTimeMs / timeLimitMs / 2) * pointsPossible);
}
