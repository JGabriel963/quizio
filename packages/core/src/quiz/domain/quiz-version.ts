import {
	copyQuestion,
	parseStoredContent,
	parseStoredTimeLimit,
	QUESTION_POINTS,
	QUESTION_TYPES,
	type Question,
	type QuestionPoints,
	type QuestionType,
	type QuizQuestion,
} from "./question";
import { parseStoredImage, sameImage } from "./question-image";

/**
 * The playable version: a frozen copy of the quiz's question list, made by
 * the editor's Salvar and never changed afterwards (spec 006, RN-01; ADR 0008).
 */
export interface QuizVersion {
	quizId: string;
	/** 1 for the first Salvar, then one more for each new version (RN-04). */
	number: number;
	questions: Question[];
	createdAt: Date;
}

/** Detached from the live list, so later edits never reach the version. */
export function newQuizVersion(input: {
	quizId: string;
	number: number;
	questions: readonly Question[];
	now: Date;
}): QuizVersion {
	return {
		quizId: input.quizId,
		number: input.number,
		questions: input.questions.map((question) =>
			copyQuestion(question, question.id),
		),
		createdAt: input.now,
	};
}

function sameContent(a: Question, b: Question): boolean {
	switch (a.type) {
		case "trueFalse":
			return b.type === "trueFalse" && a.correct === b.correct;
		case "typeAnswer":
			return (
				b.type === "typeAnswer" &&
				a.acceptedAnswers.length === b.acceptedAnswers.length &&
				a.acceptedAnswers.every(
					(answer, index) => answer === b.acceptedAnswers[index],
				)
			);
		case "slider":
			return (
				b.type === "slider" &&
				a.min === b.min &&
				a.max === b.max &&
				a.answer === b.answer &&
				a.unit === b.unit &&
				a.answerMargin === b.answerMargin
			);
		case "quiz":
			return b.type === "quiz" && sameQuizContent(a, b);
	}
}

function sameQuizContent(a: QuizQuestion, b: QuizQuestion): boolean {
	return (
		a.selection === b.selection &&
		a.choices.length === b.choices.length &&
		a.choices.every((choice, index) => {
			const other = b.choices[index];
			return choice.text === other?.text && choice.correct === other.correct;
		})
	);
}

/**
 * Same questions in the same order (spec 006, RN-19). Question ids are left
 * out: a question duplicated and then deleted leaves the same content behind.
 */
export function sameQuestionLists(
	a: readonly Question[],
	b: readonly Question[],
): boolean {
	return (
		a.length === b.length &&
		a.every((question, index) => {
			const other = b[index] as Question;
			return (
				question.text === other.text &&
				question.timeLimitSeconds === other.timeLimitSeconds &&
				question.points === other.points &&
				sameImage(question.image, other.image) &&
				sameContent(question, other)
			);
		})
	);
}

function isOneOf<T extends string | number>(
	values: readonly T[],
	value: unknown,
): value is T {
	return (values as readonly unknown[]).includes(value);
}

/**
 * Reads a stored version as tolerantly as the question rows: an entry that is
 * not a question of a known type is dropped, and bad fields fall back to the
 * defaults.
 */
export function parseVersionQuestions(raw: unknown): Question[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	return raw.flatMap((entry: unknown): Question[] => {
		if (typeof entry !== "object" || entry === null) {
			return [];
		}
		const {
			id,
			type,
			text,
			timeLimitSeconds,
			points,
			image,
			aiGenerated,
			...content
		} = entry as Record<string, unknown>;
		if (
			typeof id !== "string" ||
			!isOneOf<QuestionType>(QUESTION_TYPES, type)
		) {
			return [];
		}
		return [
			{
				id,
				text: typeof text === "string" ? text : null,
				timeLimitSeconds: parseStoredTimeLimit(type, timeLimitSeconds),
				points: isOneOf<QuestionPoints>(QUESTION_POINTS, points)
					? points
					: "standard",
				image: parseStoredImage(image),
				aiGenerated: aiGenerated === true,
				...parseStoredContent(type, content),
			},
		];
	});
}
