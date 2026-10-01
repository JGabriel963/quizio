import type {
	Question,
	QuestionPoints,
	QuestionType,
	SelectionMode,
} from "../../quiz/domain/question";
import type { QuestionImage } from "../../quiz/domain/question-image";

/** An answer as the game shows it: always filled, at a fixed position. */
export interface GameChoice {
	id: string;
	/** Position of color and shape, 0 to 5 (spec 004, RN-01). */
	shapeIndex: number;
	text: string;
	correct: boolean;
}

/**
 * A question as a game uses it, copied from the playable version when the
 * game starts (spec 009, RN-29). The quiz context's types are reused as
 * values; nothing here reads the quiz.
 */
export interface GameQuestion {
	/** 0-based position in the game. */
	index: number;
	type: QuestionType;
	text: string;
	timeLimitSeconds: number;
	points: QuestionPoints;
	selection: SelectionMode;
	/** Only the filled answers, in position order (RN-14, RN-27). */
	choices: GameChoice[];
	image: QuestionImage | null;
}

/** The two answers of a true/false question (spec 005, RN-06). */
export const TRUE_CHOICE_ID = "true";
export const FALSE_CHOICE_ID = "false";
export const TRUE_CHOICE_TEXT = "Verdadeiro";
export const FALSE_CHOICE_TEXT = "Falso";

function choicesOf(question: Question): GameChoice[] {
	switch (question.type) {
		case "quiz":
			return question.choices.flatMap((choice, shapeIndex) =>
				choice.text === null
					? []
					: [
							{
								id: choice.id,
								shapeIndex,
								text: choice.text,
								correct: choice.correct,
							},
						],
			);
		case "trueFalse":
			// "Verdadeiro" is the blue diamond and "Falso" the red triangle (RN-15).
			return [
				{
					id: TRUE_CHOICE_ID,
					shapeIndex: 1,
					text: TRUE_CHOICE_TEXT,
					correct: question.correct === true,
				},
				{
					id: FALSE_CHOICE_ID,
					shapeIndex: 0,
					text: FALSE_CHOICE_TEXT,
					correct: question.correct === false,
				},
			];
	}
}

/** The form a question of the playable version takes in a game. */
export function toGameQuestion(
	question: Question,
	index: number,
): GameQuestion {
	return {
		index,
		type: question.type,
		text: question.text ?? "",
		timeLimitSeconds: question.timeLimitSeconds,
		points: question.points,
		selection: question.type === "quiz" ? question.selection : "single",
		choices: choicesOf(question),
		image: question.image
			? {
					...question.image,
					crop: question.image.crop ? { ...question.image.crop } : null,
				}
			: null,
	};
}

function isChoice(value: unknown): value is GameChoice {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const { id, shapeIndex, text, correct } = value as Record<string, unknown>;
	return (
		typeof id === "string" &&
		typeof shapeIndex === "number" &&
		typeof text === "string" &&
		typeof correct === "boolean"
	);
}

/**
 * Reads the copy a game stored. The game wrote it itself, so the check is only
 * that it is a question at all: a row that is not comes back as null.
 */
export function parseStoredGameQuestion(raw: unknown): GameQuestion | null {
	if (typeof raw !== "object" || raw === null) {
		return null;
	}
	const stored = raw as Record<string, unknown>;
	const { index, type, text, timeLimitSeconds, points, selection, choices } =
		stored;
	if (
		typeof index !== "number" ||
		typeof type !== "string" ||
		typeof text !== "string" ||
		typeof timeLimitSeconds !== "number" ||
		typeof points !== "string" ||
		typeof selection !== "string" ||
		!Array.isArray(choices) ||
		!choices.every(isChoice)
	) {
		return null;
	}
	const image = stored.image as QuestionImage | null | undefined;
	return {
		index,
		type: type as QuestionType,
		text,
		timeLimitSeconds,
		points: points as QuestionPoints,
		selection: selection as SelectionMode,
		choices: choices.map(({ id, shapeIndex, text: choiceText, correct }) => ({
			id,
			shapeIndex,
			text: choiceText,
			correct,
		})),
		image: image && typeof image.key === "string" ? image : null,
	};
}
