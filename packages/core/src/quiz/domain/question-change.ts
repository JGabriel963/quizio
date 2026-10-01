import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";
import {
	blankContent,
	type Choice,
	choiceIdAt,
	DEFAULT_CHOICE_COUNT,
	emptyChoices,
	InvalidQuestionTypeError,
	InvalidSelectionModeError,
	MAX_CHOICE_COUNT,
	parseChoiceText,
	parsePoints,
	parseQuestionText,
	parseQuestionType,
	parseSelection,
	parseTimeLimit,
	type Question,
	type QuestionContent,
	type QuizQuestion,
	type TrueFalseQuestion,
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
			choices: { text: string | null; correct: boolean }[];
	  }
	| { type: "trueFalse"; correct: boolean | null };

/**
 * One edit of a question (specs 004, 005). Values arrive raw (from the API or
 * the optimistic client) and are validated here.
 */
export type QuestionChange =
	| { kind: "text"; text: string | null }
	| { kind: "timeLimit"; seconds: number }
	| { kind: "points"; points: string }
	| { kind: "selection"; selection: string }
	| { kind: "choiceText"; choiceId: string; text: string | null }
	| { kind: "choiceCorrect"; choiceId: string; correct: boolean }
	| { kind: "extraChoices"; visible: boolean }
	| { kind: "trueFalseCorrect"; correct: boolean }
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
	if (input.type === "trueFalse") {
		return { type: input.type, correct: input.correct };
	}
	if (
		input.choices.length !== DEFAULT_CHOICE_COUNT &&
		input.choices.length !== MAX_CHOICE_COUNT
	) {
		throw new InvalidChoiceCountError(
			`A question has ${DEFAULT_CHOICE_COUNT} or ${MAX_CHOICE_COUNT} answer slots`,
		);
	}
	const choices = input.choices.map((choice, index) => {
		const text = parseChoiceText(choice.text);
		if (choice.correct && text === null) {
			throw new EmptyChoiceCannotBeCorrectError(
				"An empty answer cannot be correct",
			);
		}
		return { id: choiceIdAt(index), text, correct: choice.correct };
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
		if (correct && choice.text === null) {
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
		question.type === "quiz" &&
		question.choices.some((choice) => choice.text !== null);
	return {
		question: {
			id: question.id,
			text: question.text,
			timeLimitSeconds: question.timeLimitSeconds,
			points: question.points,
			// The image belongs to the question, not to its type (spec 007, RN-34).
			image: copyImage(question.image),
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
			return unchanged({ ...question, text: parseQuestionText(change.text) });
		case "timeLimit":
			return unchanged({
				...question,
				timeLimitSeconds: parseTimeLimit(change.seconds),
			});
		case "points":
			return unchanged({ ...question, points: parsePoints(change.points) });
		case "selection":
			return changeSelection(requireQuiz(question), change.selection);
		case "choiceText": {
			const text = parseChoiceText(change.text);
			// RN-06: an empty answer is never correct.
			return unchanged(
				replaceChoice(requireQuiz(question), change.choiceId, (choice) => ({
					...choice,
					text,
					correct: choice.correct && text !== null,
				})),
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
