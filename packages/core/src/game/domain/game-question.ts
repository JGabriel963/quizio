import {
	type AnswerImage,
	copyAnswerImage,
	readAnswerImage,
} from "../../quiz/domain/answer-image";
import {
	choiceIdAt,
	type Question,
	type QuestionPoints,
	type QuestionType,
	type SelectionMode,
} from "../../quiz/domain/question";
import type { QuestionImage } from "../../quiz/domain/question-image";
import {
	ANSWER_MARGINS,
	type SliderScale,
} from "../../shared/domain/slider-scale";
import {
	copyTextFormatting,
	NO_FORMATTING,
	readTextFormatting,
	type TextFormatting,
} from "../../shared/domain/text-formatting";
import type { GameOptions } from "./game-options";
import { placedInOrder, wrongOrderOf } from "./puzzle";

/** An answer as the game shows it: always filled, at a fixed position. */
export interface GameChoice {
	id: string;
	/** Position of color and shape, 0 to 5 (spec 004, RN-01). */
	shapeIndex: number;
	/** Null when the answer is an image (spec 049, RN-16). */
	text: string | null;
	/** The answer's marked stretches, copied with it (spec 048, RN-16). */
	textFormatting: TextFormatting;
	/** The answer as an image instead of text (spec 049); never both. */
	image: AnswerImage | null;
	correct: boolean;
}

/** A slider's scale as the game plays it, with its unit (spec 032). */
export interface GameSlider extends SliderScale {
	unit: string | null;
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
	/** The statement's marked stretches (spec 047, RN-21). */
	textFormatting: TextFormatting;
	timeLimitSeconds: number;
	points: QuestionPoints;
	selection: SelectionMode;
	/**
	 * Only the filled answers, in position order (RN-14, RN-27). The position is
	 * the editor's, or a drawn one (spec 012, RN-23).
	 */
	choices: GameChoice[];
	/**
	 * The filled accepted answers of a type answer, as the creator wrote them
	 * (spec 031, RN-14); none for the other types. Never sent to a device before
	 * the results (RN-15).
	 */
	acceptedAnswers: string[];
	/**
	 * A slider's scale (spec 032); null for the other types. The answer and the
	 * margin never reach a device before the results (RN-23).
	 */
	slider: GameSlider | null;
	/**
	 * A puzzle's answers in the right order, by id (spec 033, RN-16); none for
	 * the other types. Never sent to a device before the results (RN-17).
	 */
	correctOrder: string[];
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
				choice.text === null && choice.image === null
					? []
					: [
							{
								id: choice.id,
								shapeIndex,
								text: choice.text,
								textFormatting: copyTextFormatting(choice.textFormatting),
								image: copyAnswerImage(choice.image),
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
					textFormatting: NO_FORMATTING,
					image: null,
					correct: question.correct === true,
				},
				{
					id: FALSE_CHOICE_ID,
					shapeIndex: 0,
					text: FALSE_CHOICE_TEXT,
					textFormatting: NO_FORMATTING,
					image: null,
					correct: question.correct === false,
				},
			];
		case "puzzle":
			// The filled slots, top to bottom: all right, in the right order (RN-08).
			return question.items
				.flatMap((text, slot) => {
					const image = question.itemImages[slot] ?? null;
					return text === null && image === null
						? []
						: [
								{
									id: choiceIdAt(slot),
									text,
									// The slot's formatting goes with its text (spec 048, RN-16).
									textFormatting: copyTextFormatting(
										question.itemFormatting[slot] ?? NO_FORMATTING,
									),
									image: copyAnswerImage(image),
									correct: true,
								},
							];
				})
				.map((choice, shapeIndex) => ({ ...choice, shapeIndex }));
		case "typeAnswer":
		case "slider":
			return [];
	}
}

/** The playable version only has complete questions, so a slider has its scale. */
function sliderOf(question: Question): GameSlider | null {
	if (question.type !== "slider") {
		return null;
	}
	const { min, max, answer } = question;
	return min === null || max === null || answer === null
		? null
		: { min, max, answer, margin: question.answerMargin, unit: question.unit };
}

/** A puzzle is copied in the right order, so its answers' order is the right one. */
function correctOrderOf(question: Question, choices: GameChoice[]): string[] {
	return question.type === "puzzle" ? choices.map(({ id }) => id) : [];
}

function acceptedAnswersOf(question: Question): string[] {
	return question.type === "typeAnswer"
		? question.acceptedAnswers.filter((answer) => answer !== null)
		: [];
}

/** The form a question of the playable version takes in a game. */
export function toGameQuestion(
	question: Question,
	index: number,
): GameQuestion {
	const choices = choicesOf(question);
	return {
		index,
		type: question.type,
		text: question.text ?? "",
		textFormatting: copyTextFormatting(question.textFormatting),
		timeLimitSeconds: question.timeLimitSeconds,
		points: question.points,
		selection: question.type === "quiz" ? question.selection : "single",
		choices,
		acceptedAnswers: acceptedAnswersOf(question),
		slider: sliderOf(question),
		correctOrder: correctOrderOf(question, choices),
		image: question.image
			? {
					...question.image,
					crop: question.image.crop ? { ...question.image.crop } : null,
				}
			: null,
	};
}

/**
 * Hands the question's positions out again among its answers: the colors and
 * shapes on the screen stay the same, each with another answer (spec 012,
 * RN-23). Each answer is renamed after its new place: the editor's ids are the
 * same in every game of the quiz, and one learned from an assignment's results
 * would tell which shape is right (audit L8).
 */
function withShuffledChoices(
	question: GameQuestion,
	shuffle: <T>(items: readonly T[]) => T[],
): GameQuestion {
	const positions = shuffle(
		question.choices.map((choice) => choice.shapeIndex),
	);
	return {
		...question,
		choices: question.choices
			.map((choice, index) => {
				const shapeIndex = positions[index] ?? choice.shapeIndex;
				return { ...choice, id: choiceIdAt(shapeIndex), shapeIndex };
			})
			.sort((a, b) => a.shapeIndex - b.shapeIndex),
	};
}

/**
 * A puzzle's answers renamed after their drawn places. The copy's ids are the
 * editor's slots, in the right order: sent to the devices as they are, sorting
 * them would give the answer away (spec 033, RN-17). The right order is mapped
 * to the new ids and stays on the server.
 */
function withDrawnIds(question: GameQuestion): GameQuestion {
	const drawnId = new Map(
		question.choices.map(({ id, shapeIndex }) => [id, choiceIdAt(shapeIndex)]),
	);
	return {
		...question,
		choices: question.choices.map((choice) => ({
			...choice,
			id: choiceIdAt(choice.shapeIndex),
		})),
		correctOrder: question.correctOrder.map((id) => drawnId.get(id) ?? id),
	};
}

/**
 * The questions as the game will play them, in the editor's order or in a
 * drawn one, by the game's options (spec 012, RN-22 to RN-24). It is drawn
 * once, when the game starts; true/false is never shuffled, and a puzzle
 * always is, never in a right order (spec 033, RN-14, RN-15).
 */
export function arrangeGameQuestions(
	questions: readonly Question[],
	options: Pick<GameOptions, "randomizeQuestions" | "randomizeAnswers">,
	shuffle: <T>(items: readonly T[]) => T[],
): GameQuestion[] {
	const ordered = options.randomizeQuestions ? shuffle(questions) : questions;
	return ordered.map((question, index) => {
		const copied = toGameQuestion(question, index);
		if (copied.type === "puzzle") {
			return withDrawnIds({
				...copied,
				choices: placedInOrder(copied, wrongOrderOf(copied, shuffle)),
			});
		}
		return options.randomizeAnswers && copied.type === "quiz"
			? withShuffledChoices(copied, shuffle)
			: copied;
	});
}

function isChoice(value: unknown): value is Omit<
	GameChoice,
	"textFormatting" | "image"
> & {
	textFormatting?: unknown;
	image?: unknown;
} {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const { id, shapeIndex, text, correct } = value as Record<string, unknown>;
	return (
		typeof id === "string" &&
		typeof shapeIndex === "number" &&
		(typeof text === "string" || text === null) &&
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
	// Games stored before spec 031 have no accepted answers.
	const acceptedAnswers = Array.isArray(stored.acceptedAnswers)
		? stored.acceptedAnswers.filter(
				(answer): answer is string => typeof answer === "string",
			)
		: [];
	return {
		index,
		type: type as QuestionType,
		text,
		// Games stored before spec 047 have none (RN-22).
		textFormatting: readTextFormatting(text, stored.textFormatting),
		timeLimitSeconds,
		points: points as QuestionPoints,
		selection: selection as SelectionMode,
		choices: choices.map(
			({
				id,
				shapeIndex,
				text: choiceText,
				textFormatting: raw,
				image: rawImage,
				correct,
			}) => ({
				id,
				shapeIndex,
				text: choiceText,
				// Games stored before spec 048 have none (RN-17).
				textFormatting: readTextFormatting(choiceText, raw),
				// Games stored before spec 049 have none.
				image: readAnswerImage(rawImage),
				correct,
			}),
		),
		acceptedAnswers,
		slider: parseStoredSlider(stored.slider),
		// Games stored before spec 033 have no right order.
		correctOrder: Array.isArray(stored.correctOrder)
			? stored.correctOrder.filter((id): id is string => typeof id === "string")
			: [],
		image: image && typeof image.key === "string" ? image : null,
	};
}

/** Games stored before spec 032, and the other types, have no scale. */
function parseStoredSlider(raw: unknown): GameSlider | null {
	if (typeof raw !== "object" || raw === null) {
		return null;
	}
	const { min, max, answer, margin, unit } = raw as Record<string, unknown>;
	if (
		typeof min !== "number" ||
		typeof max !== "number" ||
		typeof answer !== "number" ||
		!(ANSWER_MARGINS as readonly unknown[]).includes(margin)
	) {
		return null;
	}
	return {
		min,
		max,
		answer,
		margin: margin as SliderScale["margin"],
		unit: typeof unit === "string" ? unit : null,
	};
}
