import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";
import { ANSWER_MARGINS } from "../../shared/domain/slider-scale";
import {
	copyTextFormatting,
	NO_FORMATTING,
	type TextFormatting,
} from "../../shared/domain/text-formatting";
import {
	type AnswerImage,
	type AnswerImageInput,
	newAnswerImage,
	parseAnswerCrop,
	parseAnswerImage,
} from "./answer-image";
import {
	blankContent,
	type Choice,
	choiceIdAt,
	DEFAULT_CHOICE_COUNT,
	emptyChoices,
	fitTimeLimit,
	InvalidQuestionTypeError,
	InvalidSelectionModeError,
	InvalidSliderNumberError,
	isFilledChoice,
	MAX_ACCEPTED_ANSWERS,
	MAX_CHOICE_COUNT,
	PUZZLE_ITEM_COUNT,
	type PuzzleQuestion,
	parseAcceptedAnswer,
	parseAnswer,
	parsePoints,
	parseQuestionStatement,
	parseQuestionType,
	parseSelection,
	parseSliderNumber,
	parseSliderUnit,
	parseTimeLimit,
	type Question,
	type QuestionContent,
	type QuizQuestion,
	type SliderQuestion,
	type TrueFalseQuestion,
	type TypeAnswerQuestion,
	timeLimitsFor,
} from "./question";
import {
	copyImage,
	type ImageCropInput,
	newQuestionImage,
	parseImageAltText,
	parseImageCrop,
	parseImagePlacement,
	QuestionHasNoImageError,
	type QuestionImage,
} from "./question-image";

/**
 * The type-specific part of a question as a client sends it back: what the
 * editor remembered before a type change (spec 005).
 */
export type QuestionContentInput =
	| {
			type: "quiz";
			selection: string;
			choices: {
				text: string | null;
				/** Spec 048: none sent is none kept. */
				textFormatting?: TextFormatting;
				/** Spec 049: never with a text. */
				image?: AnswerImageInput | null;
				correct: boolean;
			}[];
	  }
	| { type: "trueFalse"; correct: boolean | null }
	| { type: "typeAnswer"; acceptedAnswers: (string | null)[] }
	| {
			type: "slider";
			min: number | null;
			max: number | null;
			answer: number | null;
			unit: string | null;
			answerMargin: string;
	  }
	| {
			type: "puzzle";
			items: (string | null)[];
			/** Spec 048: one per slot; missing ones are none. */
			itemFormatting?: TextFormatting[];
			/** Spec 049: one per slot, never with a text. */
			itemImages?: (AnswerImageInput | null)[];
	  };

/** Which answer an image change is about: a quiz choice or a puzzle slot (spec 049). */
export type AnswerRef = { choiceId: string } | { slot: number };

export class AnswerHasImageError extends DomainError {
	readonly code = "QUIZ.ANSWER_HAS_IMAGE";
}

export class AnswerHasNoImageError extends DomainError {
	readonly code = "QUIZ.ANSWER_HAS_NO_IMAGE";
}

/** An answer is a text or an image, never both (spec 049, RN-01, RN-27). */
export class AnswerTextAndImageError extends DomainError {
	readonly code = "QUIZ.ANSWER_TEXT_AND_IMAGE";
}

/**
 * One edit of a question (specs 004, 005). Values arrive raw (from the API or
 * the optimistic client) and are validated here.
 */
export type QuestionChange =
	/** The whole statement with its formatting; none sent is none kept (spec 047, RN-18). */
	| { kind: "text"; text: string | null; formatting?: TextFormatting }
	| { kind: "timeLimit"; seconds: number }
	| { kind: "points"; points: string }
	| { kind: "selection"; selection: string }
	/** The whole answer with its formatting; none sent is none kept (spec 048, RN-13). */
	| {
			kind: "choiceText";
			choiceId: string;
			text: string | null;
			formatting?: TextFormatting;
	  }
	| { kind: "choiceCorrect"; choiceId: string; correct: boolean }
	| { kind: "extraChoices"; visible: boolean }
	| { kind: "trueFalseCorrect"; correct: boolean }
	/** Spec 031, RN-03, RN-04: an accepted answer by position; 0 is the main one. */
	| { kind: "acceptedAnswerText"; index: number; text: string | null }
	| { kind: "acceptedAnswerAdded" }
	| { kind: "acceptedAnswerRemoved"; index: number }
	/**
	 * Spec 032, RN-04, RN-16: a slider's number as the creator typed it; null
	 * empties the min or the max. Never moves the answer.
	 */
	| {
			kind: "sliderNumber";
			field: "min" | "max" | "answer";
			value: string | null;
	  }
	| { kind: "sliderUnit"; text: string | null }
	| { kind: "answerMargin"; margin: string }
	/** Spec 033: a slot's text, and a slot taken to another place (RN-03, RN-05). */
	| {
			kind: "puzzleItemText";
			index: number;
			text: string | null;
			formatting?: TextFormatting;
	  }
	| { kind: "puzzleItemMoved"; from: number; to: number }
	/**
	 * Spec 049: an answer's image, which takes the place of its text (RN-07);
	 * null removes it and leaves the answer empty (RN-13).
	 */
	| { kind: "answerImage"; answer: AnswerRef; key: string | null }
	| { kind: "answerImageCrop"; answer: AnswerRef; crop: ImageCropInput }
	| { kind: "answerImageAltText"; answer: AnswerRef; altText: string | null }
	/** `remembered` is what the question had in that type earlier in the session (RN-17). */
	| { kind: "type"; type: string; remembered: QuestionContentInput | null }
	/** A new upload, or null to remove the image with its adjustments (spec 007). */
	| { kind: "image"; key: string | null }
	| { kind: "imagePlacement"; placement: string }
	| { kind: "imageCrop"; crop: ImageCropInput }
	| { kind: "imageAltText"; altText: string | null };

/** What the editor tells the creator after a change (spec 004, RN-08, RN-09; spec 005, RN-19). */
export type QuestionChangeNotice =
	| { kind: "multipleEnabled" }
	| { kind: "correctsCleared"; count: number }
	| { kind: "quizAnswersKept" };

export interface QuestionChangeResult {
	question: Question;
	notice: QuestionChangeNotice | null;
}

export class ChoiceNotFoundError extends NotFoundError {
	readonly code = "QUIZ.CHOICE_NOT_FOUND";
}

export class EmptyChoiceCannotBeCorrectError extends DomainError {
	readonly code = "QUIZ.EMPTY_CHOICE_CORRECT";
}

export class InvalidChoiceCountError extends DomainError {
	readonly code = "QUIZ.INVALID_CHOICE_COUNT";
}

export class AcceptedAnswerNotFoundError extends NotFoundError {
	readonly code = "QUIZ.ACCEPTED_ANSWER_NOT_FOUND";
}

export class TooManyAcceptedAnswersError extends DomainError {
	readonly code = "QUIZ.TOO_MANY_ACCEPTED_ANSWERS";
}

/** A slider's answer, once added, is never emptied (spec 032, RN-07). */
export class SliderAnswerRequiredError extends DomainError {
	readonly code = "QUIZ.SLIDER_ANSWER_REQUIRED";
}

export class InvalidAnswerMarginError extends DomainError {
	readonly code = "QUIZ.INVALID_ANSWER_MARGIN";
}

/** A puzzle has slots 0 to 3 only (spec 033, RN-03). */
export class PuzzleItemNotFoundError extends NotFoundError {
	readonly code = "QUIZ.PUZZLE_ITEM_NOT_FOUND";
}

/** A time of the editor's list that the question's type does not take (spec 031, RN-06). */
export class TimeLimitNotAllowedError extends DomainError {
	readonly code = "QUIZ.TIME_LIMIT_NOT_ALLOWED";
}

/** An edit that the question's type does not have (spec 005). */
export class QuestionChangeNotApplicableError extends DomainError {
	readonly code = "QUIZ.CHANGE_NOT_APPLICABLE";
}

/**
 * Validates type-specific content with the same rules as the edits. Answer ids
 * are the positions', whatever the client sent.
 */
export function parseQuestionContent(
	input: QuestionContentInput,
): QuestionContent {
	switch (input.type) {
		case "quiz":
			return parseQuizInput(input);
		case "trueFalse":
			return { type: input.type, correct: input.correct };
		case "typeAnswer":
			return {
				type: input.type,
				acceptedAnswers: parseAcceptedAnswers(input.acceptedAnswers),
			};
		case "slider":
			return {
				type: input.type,
				min: parseSliderValue(input.min),
				max: parseSliderValue(input.max),
				answer: parseSliderValue(input.answer),
				unit: parseSliderUnit(input.unit),
				answerMargin: parseAnswerMargin(input.answerMargin),
			};
		case "puzzle":
			return {
				type: input.type,
				...parsePuzzleItems(
					input.items,
					input.itemFormatting ?? [],
					input.itemImages ?? [],
				),
			};
	}
}

/**
 * Four slots, each checked as a quiz answer with its formatting (spec 048);
 * missing ones are empty.
 */
function parsePuzzleItems(
	items: (string | null)[],
	itemFormatting: readonly TextFormatting[],
	itemImages: readonly (AnswerImageInput | null)[],
): Pick<PuzzleQuestion, "items" | "itemFormatting" | "itemImages"> {
	if (items.length > PUZZLE_ITEM_COUNT) {
		throw new PuzzleItemNotFoundError(
			`A puzzle has ${PUZZLE_ITEM_COUNT} slots`,
		);
	}
	const slots = Array.from({ length: PUZZLE_ITEM_COUNT }, (_, index) =>
		parseTextOrImage(
			items[index],
			itemFormatting[index] ?? NO_FORMATTING,
			itemImages[index],
		),
	);
	return {
		items: slots.map(({ text }) => text),
		itemFormatting: slots.map(({ textFormatting }) => textFormatting),
		itemImages: slots.map(({ image }) => image),
	};
}

/** An answer sent whole: a text with its formatting, or an image (spec 049, RN-01). */
function parseTextOrImage(
	rawText: string | null | undefined,
	formatting: TextFormatting,
	rawImage: AnswerImageInput | null | undefined,
): {
	text: string | null;
	textFormatting: TextFormatting;
	image: AnswerImage | null;
} {
	const { text, textFormatting } = parseAnswer(rawText, formatting);
	const image = rawImage ? parseAnswerImage(rawImage) : null;
	if (image && text !== null) {
		throw new AnswerTextAndImageError(
			"An answer is a text or an image, not both",
		);
	}
	return { text, textFormatting, image };
}

/** A remembered number: finite, with at most 2 decimals (spec 032, RN-04). */
function parseSliderValue(value: number | null): number | null {
	if (value === null) {
		return null;
	}
	if (
		!Number.isFinite(value) ||
		Math.abs(value * 100 - Math.round(value * 100)) > 1e-6
	) {
		throw new InvalidSliderNumberError(`${value} is not a slider number`);
	}
	return parseSliderNumber(String(value));
}

export function parseAnswerMargin(margin: string) {
	if (!(ANSWER_MARGINS as readonly string[]).includes(margin)) {
		throw new InvalidAnswerMarginError(
			`Answer margin "${margin}" is not supported`,
		);
	}
	return margin as (typeof ANSWER_MARGINS)[number];
}

function parseAcceptedAnswers(answers: (string | null)[]): (string | null)[] {
	if (answers.length === 0 || answers.length > MAX_ACCEPTED_ANSWERS) {
		throw new TooManyAcceptedAnswersError(
			`A type answer has 1 to ${MAX_ACCEPTED_ANSWERS} accepted answers`,
		);
	}
	return answers.map(parseAcceptedAnswer);
}

function parseQuizInput(
	input: Extract<QuestionContentInput, { type: "quiz" }>,
): QuestionContent {
	if (
		input.choices.length !== DEFAULT_CHOICE_COUNT &&
		input.choices.length !== MAX_CHOICE_COUNT
	) {
		throw new InvalidChoiceCountError(
			`A question has ${DEFAULT_CHOICE_COUNT} or ${MAX_CHOICE_COUNT} answer slots`,
		);
	}
	const choices = input.choices.map((choice, index) => {
		const { text, textFormatting, image } = parseTextOrImage(
			choice.text,
			choice.textFormatting ?? NO_FORMATTING,
			choice.image,
		);
		if (choice.correct && text === null && image === null) {
			throw new EmptyChoiceCannotBeCorrectError(
				"An empty answer cannot be correct",
			);
		}
		return {
			id: choiceIdAt(index),
			text,
			textFormatting,
			image,
			correct: choice.correct,
		};
	});
	const selection = parseSelection(input.selection);
	if (
		selection === "single" &&
		choices.filter((choice) => choice.correct).length > 1
	) {
		throw new InvalidSelectionModeError(
			"Single selection allows one correct answer",
		);
	}
	return { type: input.type, selection, choices };
}

function unchanged(question: Question): QuestionChangeResult {
	return { question, notice: null };
}

function requireQuiz(question: Question): QuizQuestion {
	if (question.type !== "quiz") {
		throw new QuestionChangeNotApplicableError(
			"This change only applies to quiz questions",
		);
	}
	return question;
}

function requireTrueFalse(question: Question): TrueFalseQuestion {
	if (question.type !== "trueFalse") {
		throw new QuestionChangeNotApplicableError(
			"This change only applies to true/false questions",
		);
	}
	return question;
}

function requireTypeAnswer(question: Question): TypeAnswerQuestion {
	if (question.type !== "typeAnswer") {
		throw new QuestionChangeNotApplicableError(
			"This change only applies to type answer questions",
		);
	}
	return question;
}

function requireSlider(question: Question): SliderQuestion {
	if (question.type !== "slider") {
		throw new QuestionChangeNotApplicableError(
			"This change only applies to sliders",
		);
	}
	return question;
}

function requirePuzzle(question: Question): PuzzleQuestion {
	if (question.type !== "puzzle") {
		throw new QuestionChangeNotApplicableError(
			"This change only applies to puzzles",
		);
	}
	return question;
}

function requirePuzzleSlot(index: number): void {
	if (!Number.isInteger(index) || index < 0 || index >= PUZZLE_ITEM_COUNT) {
		throw new PuzzleItemNotFoundError(`Puzzle slot ${index} not found`);
	}
}

function setPuzzleItem(
	question: PuzzleQuestion,
	index: number,
	rawText: string | null,
	formatting: TextFormatting,
): QuestionChangeResult {
	requirePuzzleSlot(index);
	if (question.itemImages[index]) {
		throw new AnswerHasImageError("This answer is an image");
	}
	const { text, textFormatting } = parseAnswer(rawText, formatting);
	return unchanged({
		...question,
		items: question.items.map((item, i) => (i === index ? text : item)),
		itemFormatting: question.itemFormatting.map((kept, i) =>
			i === index ? textFormatting : kept,
		),
	});
}

/**
 * The text of `from` goes to `to`, and the slots between move one place
 * (spec 033, RN-05): the colors and shapes stay with the positions.
 */
function movePuzzleItem(
	question: PuzzleQuestion,
	from: number,
	to: number,
): QuestionChangeResult {
	requirePuzzleSlot(from);
	requirePuzzleSlot(to);
	const items = [...question.items];
	const [moved] = items.splice(from, 1);
	items.splice(to, 0, moved ?? null);
	// The formatting goes with its text (spec 048, RN-11).
	const itemFormatting = [...question.itemFormatting];
	const [movedFormatting] = itemFormatting.splice(from, 1);
	itemFormatting.splice(to, 0, movedFormatting ?? NO_FORMATTING);
	// And so does the image (spec 049, RN-15).
	const itemImages = [...question.itemImages];
	const [movedImage] = itemImages.splice(from, 1);
	itemImages.splice(to, 0, movedImage ?? null);
	return unchanged({ ...question, items, itemFormatting, itemImages });
}

/**
 * Applies `update` to the image of one answer, a choice or a slot (spec 049);
 * `image` is what the answer has, `null` when it is text or empty.
 */
function updateAnswerImage(
	question: Question,
	answer: AnswerRef,
	update: (image: AnswerImage | null) => AnswerImage | null,
): Question {
	if ("choiceId" in answer) {
		return replaceChoice(requireQuiz(question), answer.choiceId, (choice) => {
			const image = update(choice.image);
			return image
				? { ...choice, text: null, textFormatting: NO_FORMATTING, image }
				: // Removed: an empty answer is never correct (RN-13).
					{
						...choice,
						text: choice.image ? null : choice.text,
						textFormatting: choice.image
							? NO_FORMATTING
							: choice.textFormatting,
						image: null,
						correct: choice.image ? false : choice.correct,
					};
		});
	}
	const puzzle = requirePuzzle(question);
	requirePuzzleSlot(answer.slot);
	const kept = puzzle.itemImages[answer.slot] ?? null;
	const image = update(kept);
	const replaces = image !== null || kept !== null;
	return {
		...puzzle,
		items: puzzle.items.map((item, i) =>
			i === answer.slot && replaces ? null : item,
		),
		itemFormatting: puzzle.itemFormatting.map((formatting, i) =>
			i === answer.slot && replaces ? NO_FORMATTING : formatting,
		),
		itemImages: puzzle.itemImages.map((current, i) =>
			i === answer.slot ? image : current,
		),
	};
}

/** The image an adjustment changes; there must be one (spec 049). */
function requireAnswerImage(image: AnswerImage | null): AnswerImage {
	if (!image) {
		throw new AnswerHasNoImageError("This answer has no image");
	}
	return image;
}

/** Writes a typed number; the range may change past the answer (spec 032, RN-16). */
function setSliderNumber(
	question: SliderQuestion,
	field: "min" | "max" | "answer",
	raw: string | null,
): QuestionChangeResult {
	if (raw === null || raw.trim() === "") {
		if (field === "answer") {
			throw new SliderAnswerRequiredError(
				"A slider's answer cannot be emptied",
			);
		}
		return unchanged({ ...question, [field]: null });
	}
	const value = parseSliderNumber(raw);
	if (field === "answer" && question.answer === null) {
		// The first answer brings its range (spec 032, RN-06).
		return unchanged({
			...question,
			...sliderRangeAround(value),
			answer: value,
		});
	}
	return unchanged({ ...question, [field]: value });
}

/**
 * The range a slider gets with its first answer (spec 032, RN-06): 50 wide,
 * from the multiple of 20 strictly below the answer. It gives Kahoot's
 * examples: 600 → 580 to 630, 430 → 420 to 470, 10 → 0 to 50. Counted in
 * hundredths, so 20.5 starts at 20, not one interval lower.
 */
export function sliderRangeAround(answer: number): {
	min: number;
	max: number;
} {
	const hundredths = Math.round(answer * 100);
	const min = (Math.floor((hundredths - 1) / 2000) * 2000) / 100;
	return { min, max: min + 50 };
}

function requireAcceptedAnswerAt(
	question: TypeAnswerQuestion,
	index: number,
	first = 0,
): void {
	if (
		!Number.isInteger(index) ||
		index < first ||
		index >= question.acceptedAnswers.length
	) {
		throw new AcceptedAnswerNotFoundError("Accepted answer not found");
	}
}

function setAcceptedAnswer(
	question: TypeAnswerQuestion,
	index: number,
	rawText: string | null,
): QuestionChangeResult {
	requireAcceptedAnswerAt(question, index);
	const text = parseAcceptedAnswer(rawText);
	return unchanged({
		...question,
		acceptedAnswers: question.acceptedAnswers.map((answer, i) =>
			i === index ? text : answer,
		),
	});
}

/** Spec 031, RN-04: one empty field at a time, up to four in all. */
function addAcceptedAnswer(question: TypeAnswerQuestion): QuestionChangeResult {
	if (question.acceptedAnswers.length >= MAX_ACCEPTED_ANSWERS) {
		throw new TooManyAcceptedAnswersError(
			`A type answer has at most ${MAX_ACCEPTED_ANSWERS} accepted answers`,
		);
	}
	return unchanged({
		...question,
		acceptedAnswers: [...question.acceptedAnswers, null],
	});
}

/** Spec 031, RN-04: an extra field goes; the main one always stays. */
function removeAcceptedAnswer(
	question: TypeAnswerQuestion,
	index: number,
): QuestionChangeResult {
	requireAcceptedAnswerAt(question, index, 1);
	return unchanged({
		...question,
		acceptedAnswers: question.acceptedAnswers.filter((_, i) => i !== index),
	});
}

function replaceChoice(
	question: QuizQuestion,
	choiceId: string,
	update: (choice: Choice) => Choice,
): QuizQuestion {
	const index = question.choices.findIndex((choice) => choice.id === choiceId);
	if (index === -1) {
		throw new ChoiceNotFoundError("Answer not found in this question");
	}
	return {
		...question,
		choices: question.choices.map((choice, i) =>
			i === index ? update(choice) : { ...choice },
		),
	};
}

function markCorrect(
	question: QuizQuestion,
	choiceId: string,
	correct: boolean,
): QuestionChangeResult {
	const updated = replaceChoice(question, choiceId, (choice) => {
		if (correct && !isFilledChoice(choice)) {
			throw new EmptyChoiceCannotBeCorrectError(
				"An empty answer cannot be correct",
			);
		}
		return { ...choice, correct };
	});
	const correctCount = updated.choices.filter(
		(choice) => choice.correct,
	).length;
	if (updated.selection === "single" && correctCount > 1) {
		// RN-08: a second correct answer turns on multiple choice.
		return {
			question: { ...updated, selection: "multiple" },
			notice: { kind: "multipleEnabled" },
		};
	}
	return unchanged(updated);
}

function changeSelection(
	question: QuizQuestion,
	rawSelection: string,
): QuestionChangeResult {
	const selection = parseSelection(rawSelection);
	if (selection === "multiple") {
		return unchanged({ ...question, selection });
	}
	// RN-09: single selection keeps only the first correct answer.
	const firstCorrect = question.choices.findIndex((choice) => choice.correct);
	let cleared = 0;
	const choices = question.choices.map((choice, index) => {
		if (choice.correct && index !== firstCorrect) {
			cleared += 1;
			return { ...choice, correct: false };
		}
		return { ...choice };
	});
	return {
		question: { ...question, selection, choices },
		notice: cleared > 0 ? { kind: "correctsCleared", count: cleared } : null,
	};
}

function setExtraChoices(
	question: QuizQuestion,
	visible: boolean,
): QuestionChangeResult {
	// RN-03: slots 5 and 6 come and go together; hiding them discards them.
	const choices = visible
		? emptyChoices(MAX_CHOICE_COUNT).map(
				(empty, index) => question.choices[index] ?? empty,
			)
		: question.choices.slice(0, DEFAULT_CHOICE_COUNT);
	return unchanged({
		...question,
		choices: choices.map((choice) => ({ ...choice })),
	});
}

/**
 * Spec 005, RN-14 to RN-19: the question keeps what every type shares and gets
 * the new type's content, blank or what the editor remembered.
 */
function changeType(
	question: Question,
	rawType: string,
	remembered: QuestionContentInput | null,
): QuestionChangeResult {
	const type = parseQuestionType(rawType);
	if (type === question.type) {
		return unchanged(question);
	}
	if (remembered && remembered.type !== type) {
		throw new InvalidQuestionTypeError(
			`Remembered content is of type "${remembered.type}", not "${type}"`,
		);
	}
	const content = remembered
		? parseQuestionContent(remembered)
		: blankContent(type);
	const answersSetAside =
		question.type === "quiz" && question.choices.some(isFilledChoice);
	return {
		question: {
			id: question.id,
			text: question.text,
			textFormatting: copyTextFormatting(question.textFormatting),
			// Spec 031, RN-07: below what the new type takes, it gets its shortest time.
			timeLimitSeconds: fitTimeLimit(type, question.timeLimitSeconds),
			points: question.points,
			// The image belongs to the question, not to its type (spec 007, RN-34).
			image: copyImage(question.image),
			aiGenerated: question.aiGenerated,
			...content,
		},
		notice: answersSetAside ? { kind: "quizAnswersKept" } : null,
	};
}

/** Adjusts the image the question must already have (spec 007, RN-04). */
function adjustImage(
	question: Question,
	adjust: (image: QuestionImage) => QuestionImage,
): QuestionChangeResult {
	if (question.image === null) {
		throw new QuestionHasNoImageError("This question has no image");
	}
	return unchanged({ ...question, image: adjust(question.image) });
}

/** Applies one edit, keeping the question's invariants (specs 004, 005, 007). */
export function applyQuestionChange(
	question: Question,
	change: QuestionChange,
): QuestionChangeResult {
	switch (change.kind) {
		case "text":
			return unchanged({
				...question,
				...parseQuestionStatement(
					change.text,
					change.formatting ?? NO_FORMATTING,
				),
			});
		case "timeLimit": {
			const seconds = parseTimeLimit(change.seconds);
			if (!timeLimitsFor(question.type).includes(seconds)) {
				throw new TimeLimitNotAllowedError(
					`${seconds} s is not an allowed time for this question type`,
				);
			}
			return unchanged({ ...question, timeLimitSeconds: seconds });
		}
		case "points":
			return unchanged({ ...question, points: parsePoints(change.points) });
		case "selection":
			return changeSelection(requireQuiz(question), change.selection);
		case "choiceText": {
			const { text, textFormatting } = parseAnswer(
				change.text,
				change.formatting ?? NO_FORMATTING,
			);
			// RN-06: an empty answer is never correct.
			return unchanged(
				replaceChoice(requireQuiz(question), change.choiceId, (choice) => {
					if (choice.image) {
						throw new AnswerHasImageError("This answer is an image");
					}
					return {
						...choice,
						text,
						textFormatting,
						correct: choice.correct && text !== null,
					};
				}),
			);
		}
		case "choiceCorrect":
			return markCorrect(
				requireQuiz(question),
				change.choiceId,
				change.correct,
			);
		case "extraChoices":
			return setExtraChoices(requireQuiz(question), change.visible);
		case "trueFalseCorrect":
			return unchanged({
				...requireTrueFalse(question),
				correct: change.correct,
			});
		case "acceptedAnswerText":
			return setAcceptedAnswer(
				requireTypeAnswer(question),
				change.index,
				change.text,
			);
		case "acceptedAnswerAdded":
			return addAcceptedAnswer(requireTypeAnswer(question));
		case "acceptedAnswerRemoved":
			return removeAcceptedAnswer(requireTypeAnswer(question), change.index);
		case "sliderNumber":
			return setSliderNumber(
				requireSlider(question),
				change.field,
				change.value,
			);
		case "sliderUnit":
			return unchanged({
				...requireSlider(question),
				unit: parseSliderUnit(change.text),
			});
		case "answerMargin":
			return unchanged({
				...requireSlider(question),
				answerMargin: parseAnswerMargin(change.margin),
			});
		case "puzzleItemText":
			return setPuzzleItem(
				requirePuzzle(question),
				change.index,
				change.text,
				change.formatting ?? NO_FORMATTING,
			);
		case "puzzleItemMoved":
			return movePuzzleItem(requirePuzzle(question), change.from, change.to);
		case "answerImage":
			return unchanged(
				updateAnswerImage(question, change.answer, () =>
					change.key === null ? null : newAnswerImage(change.key),
				),
			);
		case "answerImageCrop": {
			const crop = parseAnswerCrop(change.crop);
			return unchanged(
				updateAnswerImage(question, change.answer, (image) => ({
					...requireAnswerImage(image),
					crop,
				})),
			);
		}
		case "answerImageAltText": {
			const altText = parseImageAltText(change.altText);
			return unchanged(
				updateAnswerImage(question, change.answer, (image) => ({
					...requireAnswerImage(image),
					altText,
				})),
			);
		}
		case "type":
			return changeType(question, change.type, change.remembered);
		case "image":
			// RN-13, RN-16: a new image starts over; removing takes the adjustments.
			return unchanged({
				...question,
				image: change.key === null ? null : newQuestionImage(change.key),
			});
		case "imagePlacement": {
			const placement = parseImagePlacement(change.placement);
			// RN-24: the crop is kept for when the image is back in the middle.
			return adjustImage(question, (image) => ({ ...image, placement }));
		}
		case "imageCrop": {
			const crop = parseImageCrop(change.crop);
			return adjustImage(question, (image) => ({ ...image, crop }));
		}
		case "imageAltText": {
			const altText = parseImageAltText(change.altText);
			return adjustImage(question, (image) => ({ ...image, altText }));
		}
	}
}
