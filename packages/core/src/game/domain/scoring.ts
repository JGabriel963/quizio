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
	/**
	 * Right answers marked in a multiple-selection question: each is worth the
	 * question's points (spec 010, RN-06). 1 for every other question.
	 */
	correctAnswers?: number;
}

/**
 * Kahoot's speed-based scoring: a correct answer is worth the question's
 * possible points, decaying linearly to half of them at the time limit.
 *
 *   points = round((1 - (responseTime / timeLimit) / 2) * pointsPossible)
 *
 * Answers within the first 500ms earn full points. Answer streaks award no
 * points (Kahoot removed the streak bonus in 2020); they are display-only.
 * In multiple selection the points are per right answer marked, rounded once.
 * Source: specs/product/kahoot-reference.md, section 5.
 *
 * Accepting or rejecting late answers is the live game's decision, so a
 * response time outside [0, timeLimit] is an invariant violation here.
 */
function checkResponseTime(responseTimeMs: number, timeLimitMs: number): void {
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
}

export function calculateAnswerScore({
	isCorrect,
	responseTimeMs,
	timeLimitMs,
	pointsMultiplier,
	correctAnswers = 1,
}: AnswerScoreInput): number {
	checkResponseTime(responseTimeMs, timeLimitMs);
	if (!isCorrect) {
		return 0;
	}

	const pointsPossible =
		BASE_QUESTION_POINTS *
		POINTS_MULTIPLIERS[pointsMultiplier] *
		correctAnswers;
	if (responseTimeMs < FULL_POINTS_WINDOW_MS) {
		return pointsPossible;
	}
	// The same formula with one division at the end: 19.9 s of 20 s is exactly
	// 502.5 this way, where `1 - t / T / 2` drifts to 502.4999… and rounds down.
	return Math.round(
		((2 * timeLimitMs - responseTimeMs) * pointsPossible) / (2 * timeLimitMs),
	);
}

export interface SliderScoreInput {
	/** 1 at the answer, down to 0 at the margin's edge (spec 032, RN-20). */
	precision: number;
	responseTimeMs: number;
	timeLimitMs: number;
	pointsMultiplier: PointsMultiplier;
}

/**
 * A slider answer within the margin: 80% of the points by precision and 20% by
 * speed (spec 032, RN-21). The speed factor is the one of
 * `calculateAnswerScore`: 1 within the first 500 ms, down to ½ at the limit.
 *
 *   points = round(pointsPossible × (0.8 × precision + 0.2 × speed))
 *
 * Kahoot publishes the split, not the formula: this one is ours.
 */
export function calculateSliderScore({
	precision,
	responseTimeMs,
	timeLimitMs,
	pointsMultiplier,
}: SliderScoreInput): number {
	checkResponseTime(responseTimeMs, timeLimitMs);
	const pointsPossible =
		BASE_QUESTION_POINTS * POINTS_MULTIPLIERS[pointsMultiplier];
	const speed =
		responseTimeMs < FULL_POINTS_WINDOW_MS
			? 1
			: (2 * timeLimitMs - responseTimeMs) / (2 * timeLimitMs);
	return Math.round(pointsPossible * (0.8 * precision + 0.2 * speed));
}
