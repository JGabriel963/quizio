import { DomainError } from "../../shared/domain/domain-error";
import {
	groupTypedAnswers,
	type TypedAnswerGroup,
} from "../../shared/domain/typed-answer";
import type { Answer } from "./answer";
import type { GameQuestion } from "./game-question";

/** The results animation shows at most this many tags (spec 031, RN-23a). */
export const REVEAL_TAG_LIMIT = 12;
/** Similar means at most this many letters apart (RN-28)… */
const SIMILAR_MAX_EDITS = 2;
/** …in an answer at least this long, or every short word would be similar. */
const SIMILAR_MIN_LENGTH = 4;

/** Reviewing outside the results of a type answer, or after moving on (RN-26). */
export class ReviewNotAvailableError extends DomainError {
	readonly code = "GAME.REVIEW_NOT_AVAILABLE";
}

/** An accepted answer of the editor, or an answer nobody sent (RN-29). */
export class AnswerNotReviewableError extends DomainError {
	readonly code = "GAME.ANSWER_NOT_REVIEWABLE";
}

const graphemes = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

function lettersOf(text: string): string[] {
	return Array.from(graphemes.segment(text), ({ segment }) => segment);
}

/** Levenshtein distance, giving up as soon as it is over `max`. */
function withinEdits(a: string[], b: string[], max: number): boolean {
	if (Math.abs(a.length - b.length) > max) {
		return false;
	}
	let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		const current = [i];
		for (let j = 1; j <= b.length; j++) {
			current[j] = Math.min(
				(previous[j] ?? 0) + 1,
				(current[j - 1] ?? 0) + 1,
				(previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
			);
		}
		if (Math.min(...current) > max) {
			return false;
		}
		previous = current;
	}
	return (previous[b.length] ?? max + 1) <= max;
}

/**
 * A wrong answer the host probably wants to see first: at most 2 letters away
 * from a correct one, normalized, and at least 4 characters long (RN-28).
 */
export function isSimilarAnswer(
	answerKey: string,
	correctKeys: readonly string[],
): boolean {
	const letters = lettersOf(answerKey);
	if (letters.length < SIMILAR_MIN_LENGTH) {
		return false;
	}
	return correctKeys.some(
		(key) =>
			key !== answerKey &&
			withinEdits(letters, lettersOf(key), SIMILAR_MAX_EDITS),
	);
}

/**
 * The tags of the results animation: every correct group, then the most sent
 * wrong ones, `REVEAL_TAG_LIMIT` in all (RN-23, RN-23a). Groups come sorted
 * by `groupTypedAnswers`.
 */
export function revealTags(
	groups: readonly TypedAnswerGroup[],
): TypedAnswerGroup[] {
	const correct = groups.filter((group) => group.correct);
	const wrong = groups.filter((group) => !group.correct);
	return [
		...correct,
		...wrong.slice(0, Math.max(0, REVEAL_TAG_LIMIT - correct.length)),
	];
}

/** The question's accepted answers and the typed answers sent, grouped (RN-24, RN-27). */
export function typedAnswerGroupsOf(
	question: GameQuestion,
	answers: readonly Answer[],
): TypedAnswerGroup[] {
	return groupTypedAnswers(
		question.acceptedAnswers,
		answers.flatMap((answer) =>
			answer.text === null
				? []
				: [
						{
							text: answer.text,
							correct: answer.correctness === "correct",
							receivedAt: answer.receivedAt,
						},
					],
		),
	);
}

export interface ReviewChange {
	/** The normalized form of the answers it marks. */
	key: string;
	correct: boolean;
}

/**
 * The host's marks, checked against the answers sent: an accepted answer
 * stays correct and a form nobody sent cannot be marked (RN-29). A mark that
 * changes nothing is dropped.
 */
export function parseReviewChanges(
	groups: readonly TypedAnswerGroup[],
	changes: readonly ReviewChange[],
): ReviewChange[] {
	const byKey = new Map(groups.map((group) => [group.key, group]));
	return changes.filter((change) => {
		const group = byKey.get(change.key);
		if (!group || group.accepted || group.count === 0) {
			throw new AnswerNotReviewableError(
				"Only answers players sent can be marked",
			);
		}
		return group.correct !== change.correct;
	});
}
