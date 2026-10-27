import type { GameMode } from "../../game/domain/game";
import type { GamePhase } from "../../game/domain/game-progress";
import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";
import { characterCount } from "../../shared/domain/text-length";

/** Where a report is listed (spec 015, RN-22). */
export const REPORT_SECTIONS = ["reports", "trash"] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

/** The same limit as a quiz's title (spec 015, RN-46). */
export const REPORT_NAME_MAX_LENGTH = 95;

/**
 * A report as the list knows it: a live game that started and is over (spec
 * 015, RN-01), or an assignment, open or not (spec 029, RN-27), read from the
 * game's own rows. The reports context projects
 * the game, so it reuses the game's value types and none of its behavior.
 */
export interface ReportHeader {
	gameId: string;
	ownerId: string;
	/** A live game or an assignment (spec 029). */
	mode: GameMode;
	/** The report's own name, or the game's title (RN-45). */
	name: string;
	quizId: string;
	/** Null once the quiz was deleted for good (RN-05). */
	quiz: {
		/** Its owner, who may be somebody else than the game's (spec 037). */
		ownerId: string;
		trashed: boolean;
		/** It has a playable version. */
		playable: boolean;
		coverImageKey: string | null;
	} | null;
	/** How many questions the game had (RN-24). */
	questionCount: number;
	/**
	 * `finished` went to the podium; `ended` stopped before it (RN-25), or is
	 * an assignment that is over; `open` is an assignment before its deadline
	 * (spec 029, RN-29).
	 */
	status: "finished" | "ended" | "open";
	/** Where an ended game stopped; null for a finished one. */
	stoppedAt: { questionIndex: number; phase: GamePhase } | null;
	startedAt: Date;
	/** Null while an assignment is open. */
	endedAt: Date | null;
	/** When the game closes by itself: an assignment's deadline (spec 029). */
	deadline: Date;
	/** The PIN of an open assignment, to share again (spec 029, RN-32). */
	pin: string | null;
	trashedAt: Date | null;
}

/** Missing, of another creator, never started or still being played (RN-01 to RN-03). */
export class ReportNotFoundError extends NotFoundError {
	readonly code = "REPORT.NOT_FOUND";
}

/** A report in the trash is not opened or renamed (RN-51). */
export class ReportInTrashError extends DomainError {
	readonly code = "REPORT.IN_TRASH";
}

/** Only what is in the trash is deleted for good (RN-53). */
export class ReportNotInTrashError extends DomainError {
	readonly code = "REPORT.NOT_IN_TRASH";
}

/** An open assignment is ended before its report goes to the trash (spec 029, RN-41). */
export class ReportAssignmentOpenError extends DomainError {
	readonly code = "REPORT.ASSIGNMENT_OPEN";
}

export class InvalidReportNameError extends DomainError {
	readonly code = "REPORT.INVALID_NAME";
}

/**
 * How many questions reached their results (RN-09): all of them in a finished
 * game; in one that was ended, the ones before where it stopped, plus that one
 * if its results were already out. The game works its totals out the same way
 * (`revealedThrough`), and the two must agree.
 */
export function playedQuestionCount(header: ReportHeader): number {
	// Each participant plays every question of an assignment (spec 029, RN-35).
	if (header.mode === "assignment" || header.status === "finished") {
		return header.questionCount;
	}
	if (header.stoppedAt === null) {
		return 0;
	}
	const { questionIndex, phase } = header.stoppedAt;
	const revealed = phase === "results" || phase === "scoreboard";
	return Math.min(
		header.questionCount,
		revealed ? questionIndex + 1 : questionIndex,
	);
}

/** The game was closed before its podium (RN-25). */
export function endedEarly(header: ReportHeader): boolean {
	return header.mode === "live" && header.status === "ended";
}

/** An assignment before its deadline (spec 029). */
export function isOpenAssignment(header: ReportHeader): boolean {
	return header.status === "open";
}

export function assertCanTrash(header: ReportHeader): void {
	if (isOpenAssignment(header)) {
		throw new ReportAssignmentOpenError(
			"End the assignment before moving its report to the trash",
		);
	}
}

/** Another creator's report does not exist for the caller (RN-03). */
export function requireOwnedReport(
	header: ReportHeader | null,
	ownerId: string,
): ReportHeader {
	if (!header || header.ownerId !== ownerId) {
		throw new ReportNotFoundError("Report not found");
	}
	return header;
}

export function assertOutOfTrash(header: ReportHeader): void {
	if (header.trashedAt) {
		throw new ReportInTrashError(
			"Reports in the trash cannot be opened; restore it first",
		);
	}
}

export function assertInTrash(header: ReportHeader): void {
	if (!header.trashedAt) {
		throw new ReportNotInTrashError(
			"Only reports in the trash can be deleted for good",
		);
	}
}

/** 1 to 95 characters, without the spaces at the ends (RN-46). */
export function parseReportName(raw: string): string {
	const name = raw.trim();
	if (name === "") {
		throw new InvalidReportNameError("A report needs a name");
	}
	if (characterCount(name) > REPORT_NAME_MAX_LENGTH) {
		throw new InvalidReportNameError(
			`A report's name must have at most ${REPORT_NAME_MAX_LENGTH} characters`,
		);
	}
	return name;
}

/** The quiz is there to be opened (RN-05). */
export function canViewQuiz(header: ReportHeader): boolean {
	return header.quiz !== null && !header.quiz.trashed;
}

/** "Jogar de novo" needs a quiz out of the trash with a playable version (RN-48). */
export function canPlayAgain(header: ReportHeader): boolean {
	return canViewQuiz(header) && header.quiz?.playable === true;
}
