/**
 * Whether the chosen pages of a PDF already hold a list of questions, so the
 * assistant asks "Extrair ou gerar?" before generating (spec 027, RN-16).
 *
 * A guess over the pages' text, without the model, so it never spends a
 * generation. Missing a list only skips that question: the "Extrair perguntas"
 * switch is still there (RN-15).
 */

/** "1. … ?" or "2) … ?", with or without line breaks around it. */
const NUMBERED_QUESTION = /(?:^|\s)\d{1,3}[.)]\s+[^?\n]{3,200}\?/g;

/** An "a)" answer followed by a "b)" one: "a) …", "(A) …", "a. …". */
const ANSWER_BLOCK =
	/(?:^|[\s])\(?a[).]\s[\s\S]{1,200}?(?:^|[\s])\(?b[).]\s/gim;

/** How many questions make a list. */
const MIN_QUESTIONS = 2;

function countMatches(text: string, pattern: RegExp): number {
	return text.match(pattern)?.length ?? 0;
}

export function looksLikeQuestionList(pageTexts: readonly string[]): boolean {
	const text = pageTexts.join("\n");
	return (
		Math.max(
			countMatches(text, NUMBERED_QUESTION),
			countMatches(text, ANSWER_BLOCK),
		) >= MIN_QUESTIONS
	);
}
