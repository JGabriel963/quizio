import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";
import {
	duplicateQuizTitle,
	type QuizDetails,
	type QuizVisibility,
} from "./quiz-details";

/** Only drafts exist until the editor feature adds publishing (spec 001, RN-11). */
export type QuizStatus = "draft";

export interface Quiz {
	id: string;
	ownerId: string;
	title: string | null;
	description: string | null;
	coverImageKey: string | null;
	visibility: QuizVisibility;
	status: QuizStatus;
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
	return {
		...quiz,
		title: change.details.title,
		description: change.details.description,
		visibility: change.details.visibility,
		coverImageKey: change.coverImageKey,
		updatedAt: now,
	};
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
