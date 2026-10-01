import { DomainError } from "../../shared/domain/domain-error";
import type { GameQuestion } from "./game-question";

/**
 * How an answer did (spec 009, RN-24). A player without an answer is not
 * graded: the device shows "Tempo esgotado".
 */
export const CORRECTNESS = ["correct", "partiallyCorrect", "wrong"] as const;
export type Correctness = (typeof CORRECTNESS)[number];

/** What a player sent for one question: one per question, never changed (RN-17). */
export interface Answer {
	gameId: string;
	questionIndex: number;
	playerId: string;
	/** In the question's order. */
	choiceIds: string[];
	/** Measured by the server, from the answers opening (RN-18). */
	responseTimeMs: number;
	correctness: Correctness;
	receivedAt: Date;
}

/** How many players chose each answer of a question, in its order (RN-22). */
export type AnswerDistribution = { choiceId: string; count: number }[];

/** Out of the answers phase, or past the time limit (RN-20). */
export class AnswersClosedError extends DomainError {
	readonly code = "GAME.ANSWERS_CLOSED";
}

export class AlreadyAnsweredError extends DomainError {
	readonly code = "GAME.ALREADY_ANSWERED";
}

export class InvalidAnswerError extends DomainError {
	readonly code = "GAME.INVALID_ANSWER";
}

/**
 * The chosen answers, in the question's order: at least one, none repeated,
 * all of the question, and exactly one in single selection.
 */
export function parseAnswerChoices(
	question: GameQuestion,
	choiceIds: readonly string[],
): string[] {
	const chosen = new Set(choiceIds);
	const known = question.choices.filter((choice) => chosen.has(choice.id));
	if (
		choiceIds.length === 0 ||
		chosen.size !== choiceIds.length ||
		known.length !== chosen.size
	) {
		throw new InvalidAnswerError("The answer is not of this question");
	}
	if (question.selection === "single" && known.length !== 1) {
		throw new InvalidAnswerError(
			"A single-selection question takes one answer",
		);
	}
	return known.map((choice) => choice.id);
}

/**
 * Any wrong answer makes it wrong. In multiple selection, all the right ones
 * are correct and only some of them partially correct (RN-24).
 */
export function correctnessOf(
	question: GameQuestion,
	choiceIds: readonly string[],
): Correctness {
	const chosen = new Set(choiceIds);
	const picked = question.choices.filter((choice) => chosen.has(choice.id));
	if (picked.length === 0 || picked.some((choice) => !choice.correct)) {
		return "wrong";
	}
	if (question.selection === "single") {
		return "correct";
	}
	const rightAnswers = question.choices.filter((choice) => choice.correct);
	return picked.length === rightAnswers.length ? "correct" : "partiallyCorrect";
}

/** Each answer a player marked counts once in its bar (RN-22, RN-23). */
export function answerDistribution(
	question: GameQuestion,
	answers: readonly Pick<Answer, "choiceIds">[],
): AnswerDistribution {
	return question.choices.map((choice) => ({
		choiceId: choice.id,
		count: answers.filter((answer) => answer.choiceIds.includes(choice.id))
			.length,
	}));
}
