import { normalizeSearchText } from "./search-text";

/** Signs Kahoot ignores when comparing typed answers (spec 031, RN-13 c). */
export const IGNORED_ANSWER_SIGNS = "~`!@#$%^&*(){}[];:\"'<,.>?/\\|-_+=";

const IGNORED_SIGN = new RegExp(
	`[${IGNORED_ANSWER_SIGNS.replace(/[\\\]^-]/g, "\\$&")}]`,
	"g",
);
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
/** Emoji pictographs plus what joins or styles them (variation selector, ZWJ, skin tones). */
const EMOJI_PART =
	/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}|[\u{1F3FB}-\u{1F3FF}]/gu;

/**
 * The form typed answers are compared in (spec 031, RN-13): no case, no
 * accents, none of the ignored signs (each counts as a space, so "São-Paulo"
 * is "São Paulo"), spaces collapsed and trimmed, and emojis dropped when the
 * answer has letters or digits. "" when nothing is left.
 */
export function normalizeTypedAnswer(text: string): string {
	const withoutSigns = text.replace(IGNORED_SIGN, " ");
	const withoutEmojis = LETTER_OR_DIGIT.test(withoutSigns)
		? withoutSigns.replace(EMOJI_PART, " ")
		: withoutSigns;
	return normalizeSearchText(withoutEmojis);
}

export interface TypedAnswerGroup {
	/** The normalized form, which identifies the group. */
	key: string;
	/** As the creator wrote it, or as the first player who sent it did. */
	text: string;
	count: number;
	correct: boolean;
	/** One of the question's accepted answers: always correct (RN-29). */
	accepted: boolean;
}

export interface SentTypedAnswer {
	text: string;
	correct: boolean;
	receivedAt: Date;
}

/**
 * The question's accepted answers (even with nobody sending them) and the sent
 * answers, one group per normalized form: correct groups first, then by how
 * many sent them (RN-24, RN-27, RN-37). Ties keep the creator's order, then
 * the order of arrival.
 */
export function groupTypedAnswers(
	acceptedAnswers: readonly string[],
	answers: readonly SentTypedAnswer[],
): TypedAnswerGroup[] {
	const groups = new Map<string, TypedAnswerGroup>();
	for (const text of acceptedAnswers) {
		const key = normalizeTypedAnswer(text);
		if (key !== "" && !groups.has(key)) {
			groups.set(key, { key, text, count: 0, correct: true, accepted: true });
		}
	}
	const byArrival = [...answers].sort(
		(a, b) => a.receivedAt.getTime() - b.receivedAt.getTime(),
	);
	for (const answer of byArrival) {
		const key = normalizeTypedAnswer(answer.text);
		const group = groups.get(key);
		if (group) {
			group.count++;
		} else {
			groups.set(key, {
				key,
				text: answer.text,
				count: 1,
				correct: answer.correct,
				accepted: false,
			});
		}
	}
	return [...groups.values()].sort(
		(a, b) => Number(b.correct) - Number(a.correct) || b.count - a.count,
	);
}
