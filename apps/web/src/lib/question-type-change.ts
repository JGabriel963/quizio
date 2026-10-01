import {
	type Question,
	type QuestionContent,
	type QuestionType,
	questionContent,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChange } from "@quizio/core/quiz/domain/question-change";

/**
 * What each question had in each type, kept only while the editor is open
 * (spec 005, RN-17, RN-18): never saved, so a reload forgets it. Keyed by
 * question id, so a copy starts with nothing (RN-21).
 */
export type RememberedContents = Map<
	string,
	Partial<Record<QuestionType, QuestionContent>>
>;

export function createRememberedContents(): RememberedContents {
	return new Map();
}

/**
 * The change that turns `question` into `type`, or null when it already is.
 * Sets the current answers aside and sends back the ones the question had in
 * the target type earlier in this session.
 */
export function typeChangeFor(
	remembered: RememberedContents,
	question: Question,
	type: QuestionType,
): QuestionChange | null {
	if (question.type === type) {
		return null;
	}
	const ofQuestion = remembered.get(question.id) ?? {};
	remembered.set(question.id, {
		...ofQuestion,
		[question.type]: questionContent(question),
	});
	return { kind: "type", type, remembered: ofQuestion[type] ?? null };
}
