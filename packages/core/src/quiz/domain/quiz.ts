import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";
import {
	duplicateQuizTitle,
	parseQuizDescription,
	parseQuizTitle,
	type QuizDetails,
	type QuizVisibility,
} from "./quiz-details";

/**
 * A draft was never saved as playable; a published quiz has a playable
 * version and never goes back to draft (spec 006, RN-02, RN-03).
 */
export const QUIZ_STATUSES = ["draft", "published"] as const;
export type QuizStatus = (typeof QUIZ_STATUSES)[number];

/** What the status badge shows (spec 006, RN-22, RN-30). */
export type QuizPublishState = "draft" | "published" | "unpublishedChanges";

export interface Quiz {
	id: string;
	ownerId: string;
	title: string | null;
	description: string | null;
	coverImageKey: string | null;
	visibility: QuizVisibility;
	status: QuizStatus;
	/** Number of the playable version in force; null in a draft (spec 006, RN-04). */
	publishedVersion: number | null;
	/** When that version was saved. */
	publishedAt: Date | null;
	/**
	 * The live question list differs from the playable version (RN-19). Derived
	 * data, kept on the quiz so listings need no question content.
	 */
	hasUnpublishedChanges: boolean;
	createdAt: Date;
	updatedAt: Date;
	trashedAt: Date | null;
}

export class QuizNotFoundError extends NotFoundError {
	readonly code = "QUIZ.NOT_FOUND";
}

export class QuizInTrashError extends DomainError {
	readonly code = "QUIZ.IN_TRASH";
}

export class QuizNotInTrashError extends DomainError {
	readonly code = "QUIZ.NOT_IN_TRASH";
}

export class InvalidCoverImageError extends DomainError {
	readonly code = "QUIZ.INVALID_COVER";
}

/** Publishing needs a title, and a published quiz keeps one (spec 006, RN-12, RN-21). */
export class QuizTitleRequiredError extends DomainError {
	readonly code = "QUIZ.TITLE_REQUIRED";
}

export class QuizNotPublishedError extends DomainError {
	readonly code = "QUIZ.NOT_PUBLISHED";
}

export function newQuiz(input: {
	id: string;
	ownerId: string;
	details: QuizDetails;
	coverImageKey: string | null;
	now: Date;
}): Quiz {
	return {
		id: input.id,
		ownerId: input.ownerId,
		title: input.details.title,
		description: input.details.description,
		coverImageKey: input.coverImageKey,
		visibility: input.details.visibility,
		status: "draft",
		publishedVersion: null,
		publishedAt: null,
		hasUnpublishedChanges: false,
		createdAt: input.now,
		updatedAt: input.now,
		trashedAt: null,
	};
}

/** Quizzes in the trash are read-only until restored (RN-22). */
export function assertQuizEditable(quiz: Quiz): void {
	if (quiz.trashedAt) {
		throw new QuizInTrashError(
			"Quizzes in the trash cannot be changed; restore it first",
		);
	}
}

export function changeQuizDetails(
	quiz: Quiz,
	change: { details: QuizDetails; coverImageKey: string | null },
	now: Date,
): Quiz {
	assertQuizEditable(quiz);
	assertKeepsTitle(quiz, change.details.title);
	return {
		...quiz,
		title: change.details.title,
		description: change.details.description,
		visibility: change.details.visibility,
		coverImageKey: change.coverImageKey,
		updatedAt: now,
	};
}

/** Every change made in the editor is an edit of the quiz (spec 003, RN-24). */
export function touchQuiz(quiz: Quiz, now: Date): Quiz {
	assertQuizEditable(quiz);
	return { ...quiz, updatedAt: now };
}

/** Title typed in the editor header (spec 003, RN-18). */
export function renameQuiz(
	quiz: Quiz,
	rawTitle: string | null,
	now: Date,
): Quiz {
	const title = parseQuizTitle(rawTitle);
	const touched = touchQuiz(quiz, now);
	assertKeepsTitle(quiz, title);
	return { ...touched, title };
}

function assertKeepsTitle(quiz: Quiz, title: string | null): void {
	if (quiz.status === "published" && title === null) {
		throw new QuizTitleRequiredError("A published quiz must keep a title");
	}
}

/** Title and description typed in "Toques finais", right before publishing (spec 006, RN-12). */
export function withFinishingTouches(
	quiz: Quiz,
	touches: { title: string | null; description: string | null },
): Quiz {
	assertQuizEditable(quiz);
	return {
		...quiz,
		title: parseQuizTitle(touches.title),
		description: parseQuizDescription(touches.description),
	};
}

/**
 * The quiz once its question list was frozen as the next version (spec 006,
 * RN-15, RN-17). The caller checks the questions; the title is checked here.
 */
export function publishQuiz(quiz: Quiz, now: Date): Quiz {
	assertQuizEditable(quiz);
	if (quiz.title === null) {
		throw new QuizTitleRequiredError("A quiz needs a title to be published");
	}
	return {
		...quiz,
		status: "published",
		publishedVersion: (quiz.publishedVersion ?? 0) + 1,
		publishedAt: now,
		hasUnpublishedChanges: false,
		updatedAt: now,
	};
}

/** An edit of the questions: only a published quiz can have pending changes (RN-19). */
export function markQuizChanges(
	quiz: Quiz,
	differsFromVersion: boolean,
	now: Date,
): Quiz {
	return {
		...touchQuiz(quiz, now),
		hasUnpublishedChanges: quiz.status === "published" && differsFromVersion,
	};
}

export function quizPublishState(
	quiz: Pick<Quiz, "status" | "hasUnpublishedChanges">,
): QuizPublishState {
	if (quiz.status === "draft") {
		return "draft";
	}
	return quiz.hasUnpublishedChanges ? "unpublishedChanges" : "published";
}

/** Moving to the trash is not an edit: updatedAt stays (RN-18). Idempotent. */
export function trashQuiz(quiz: Quiz, now: Date): Quiz {
	return quiz.trashedAt ? quiz : { ...quiz, trashedAt: now };
}

/** Idempotent, so a repeated "undo" never fails. */
export function restoreQuiz(quiz: Quiz): Quiz {
	return quiz.trashedAt ? { ...quiz, trashedAt: null } : quiz;
}

export function assertPermanentlyDeletable(quiz: Quiz): void {
	if (!quiz.trashedAt) {
		throw new QuizNotInTrashError(
			"Only quizzes in the trash can be deleted permanently",
		);
	}
}

export function copyQuiz(
	source: Quiz,
	copy: { id: string; coverImageKey: string | null; now: Date },
): Quiz {
	assertQuizEditable(source);
	return newQuiz({
		id: copy.id,
		ownerId: source.ownerId,
		details: {
			title: duplicateQuizTitle(source.title),
			description: source.description,
			visibility: source.visibility,
		},
		coverImageKey: copy.coverImageKey,
		now: copy.now,
	});
}

/** Missing and foreign quizzes are indistinguishable to the caller (RN-10). */
export function requireOwnedQuiz(quiz: Quiz | null, ownerId: string): Quiz {
	if (!quiz || quiz.ownerId !== ownerId) {
		throw new QuizNotFoundError("Quiz not found");
	}
	return quiz;
}
