import { DomainError } from "../../shared/domain/domain-error";
import { characterCount } from "../../shared/domain/text-length";
import { normalizeTypedAnswer } from "../../shared/domain/typed-answer";
import type { GameQuestion } from "./game-question";
import { calculateAnswerScore } from "./scoring";

/**
 * How an answer did (spec 009, RN-24). A player without an answer is not
 * graded: the device shows "Tempo esgotado".
 */
export const CORRECTNESS = ["correct", "partiallyCorrect", "wrong"] as const;
export type Correctness = (typeof CORRECTNESS)[number];

/** A typed answer has up to 20 characters, like the accepted ones (spec 031, RN-17). */
export const TYPED_ANSWER_MAX_LENGTH = 20;

/** What a player sent: the marked answers, or the typed text of a type answer (spec 031). */
export interface AnswerResponse {
	choiceIds: string[];
	text: string | null;
}

/** What a player sent for one question: one per question, never changed by the player (RN-17). */
export interface Answer {
	gameId: string;
	questionIndex: number;
	playerId: string;
	/** In the question's order. */
	choiceIds: string[];
	/** The typed text of a type answer, trimmed; null for the other types (spec 031). */
	text: string | null;
	/** Measured by the server, from the answers opening (RN-18). */
	responseTimeMs: number;
	correctness: Correctness;
	/**
	 * Worked out on receipt (spec 010, RN-07); only the host's review of a type
	 * answer changes it afterwards (spec 031, RN-30).
	 */
	points: number;
	receivedAt: Date;
	/** When the host's review changed this answer (spec 031, RN-31). */
	reviewedAt: Date | null;
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
 * What a player sent, checked against the question: the typed text of a type
 * answer (1 to 20 characters once trimmed, spec 031, RN-17), the marked
 * answers otherwise; never both.
 */
export function parseAnswerResponse(
	question: GameQuestion,
	raw: { choiceIds?: readonly string[]; text?: string | null },
): AnswerResponse {
	if (question.type !== "typeAnswer") {
		if (raw.text !== undefined && raw.text !== null) {
			throw new InvalidAnswerError("This question takes marked answers");
		}
		return {
			choiceIds: parseAnswerChoices(question, raw.choiceIds ?? []),
			text: null,
		};
	}
	const text = raw.text?.trim() ?? "";
	if (
		(raw.choiceIds?.length ?? 0) > 0 ||
		text === "" ||
		characterCount(text) > TYPED_ANSWER_MAX_LENGTH
	) {
		throw new InvalidAnswerError(
			`A type answer takes 1 to ${TYPED_ANSWER_MAX_LENGTH} typed characters`,
		);
	}
	return { choiceIds: [], text };
}

/** The typed text equals an accepted answer once both are normalized (spec 031, RN-13, RN-14). */
function matchesAcceptedAnswer(question: GameQuestion, text: string): boolean {
	const typed = normalizeTypedAnswer(text);
	return (
		typed !== "" &&
		question.acceptedAnswers.some(
			(answer) => normalizeTypedAnswer(answer) === typed,
		)
	);
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

/**
 * What an answer is worth (spec 010, RN-01 to RN-06): by speed, per right
 * answer marked, nothing if any marked answer is wrong or the question gives
 * no points. `responseTimeMs` is the server's, within the time limit.
 */
export function answerPoints(
	question: GameQuestion,
	choiceIds: readonly string[],
	responseTimeMs: number,
): number {
	const chosen = new Set(choiceIds);
	return calculateAnswerScore({
		isCorrect: correctnessOf(question, choiceIds) !== "wrong",
		responseTimeMs,
		timeLimitMs: question.timeLimitSeconds * 1000,
		pointsMultiplier: question.points,
		correctAnswers: question.choices.filter(
			(choice) => choice.correct && chosen.has(choice.id),
		).length,
	});
}

/**
 * How a response did and what it is worth, measured on receipt: a type answer
 * is right or wrong as a whole (spec 031, RN-14, RN-16), the others go by
 * their answers.
 */
export function gradeAnswer(
	question: GameQuestion,
	response: AnswerResponse,
	responseTimeMs: number,
): Pick<Answer, "correctness" | "points"> {
	if (question.type !== "typeAnswer") {
		return {
			correctness: correctnessOf(question, response.choiceIds),
			points: answerPoints(question, response.choiceIds, responseTimeMs),
		};
	}
	const correct =
		response.text !== null && matchesAcceptedAnswer(question, response.text);
	return {
		correctness: correct ? "correct" : "wrong",
		points: reviewedPoints(question, correct, responseTimeMs),
	};
}

/**
 * What a typed answer is worth when it is right or wrong: by speed, with the
 * response time the server measured on receipt. The review uses it to grade
 * again (spec 031, RN-30).
 */
export function reviewedPoints(
	question: GameQuestion,
	correct: boolean,
	responseTimeMs: number,
): number {
	return calculateAnswerScore({
		isCorrect: correct,
		responseTimeMs,
		timeLimitMs: question.timeLimitSeconds * 1000,
		pointsMultiplier: question.points,
	});
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
