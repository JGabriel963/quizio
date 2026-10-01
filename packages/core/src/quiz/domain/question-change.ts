import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";
import {
	type Choice,
	choiceIdAt,
	DEFAULT_CHOICE_COUNT,
	emptyChoices,
	InvalidSelectionModeError,
	MAX_CHOICE_COUNT,
	parseChoiceText,
	parsePoints,
	parseQuestionText,
	parseSelection,
	parseTimeLimit,
	type Question,
	type QuestionType,
} from "./question";

/**
 * One edit of a question (spec 004). Values arrive raw (from the API or the
 * optimistic client) and are validated here.
 */
export type QuestionChange =
	| { kind: "text"; text: string | null }
	| { kind: "timeLimit"; seconds: number }
	| { kind: "points"; points: string }
	| { kind: "selection"; selection: string }
	| { kind: "choiceText"; choiceId: string; text: string | null }
	| { kind: "choiceCorrect"; choiceId: string; correct: boolean }
	| { kind: "extraChoices"; visible: boolean };

/** What the editor tells the creator after a change (RN-08, RN-09). */
export type QuestionChangeNotice =
	| { kind: "multipleEnabled" }
	| { kind: "correctsCleared"; count: number };

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

/** A whole question as a client sends it back (the "Desfazer" of a deletion). */
export interface QuestionInput {
	id: string;
	type: QuestionType;
	text: string | null;
	timeLimitSeconds: number;
	points: string;
	selection: string;
	choices: { text: string | null; correct: boolean }[];
}

/**
 * Validates a whole question with the same rules as the edits. Answer ids are
 * the positions', whatever the client sent.
 */
export function parseQuestion(input: QuestionInput): Question {
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
	return {
		id: input.id,
		type: input.type,
		text: parseQuestionText(input.text),
		timeLimitSeconds: parseTimeLimit(input.timeLimitSeconds),
		points: parsePoints(input.points),
		selection,
		choices,
	};
}

function unchanged(question: Question): QuestionChangeResult {
	return { question, notice: null };
}

function replaceChoice(
	question: Question,
	choiceId: string,
	update: (choice: Choice) => Choice,
): Question {
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
	question: Question,
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
	question: Question,
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
	question: Question,
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

/** Applies one edit, keeping the question's invariants (spec 004). */
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
			return changeSelection(question, change.selection);
		case "choiceText": {
			const text = parseChoiceText(change.text);
			// RN-06: an empty answer is never correct.
			return unchanged(
				replaceChoice(question, change.choiceId, (choice) => ({
					...choice,
					text,
					correct: choice.correct && text !== null,
				})),
			);
		}
		case "choiceCorrect":
			return markCorrect(question, change.choiceId, change.correct);
		case "extraChoices":
			return setExtraChoices(question, change.visible);
	}
}
