import { DomainError } from "../../shared/domain/domain-error";
import { assertGameOpen, type Game, requireAssignment } from "./game";

/**
 * How far ahead a deadline may be (spec 029, RN-08): Kahoot's limit, kept as
 * an instance setting, so the PIN of an assignment stays temporary.
 */
export const ASSIGNMENT_DEFAULT_MAX_DEADLINE_DAYS = 28;

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Mais opções" of "Configurar atividade" (spec 029, RN-11 to RN-13). */
export interface AssignmentOptions {
	gameCharacters: boolean;
	/** Off, the questions have no time and answers lose no points for it. */
	questionTimer: boolean;
	/** In a drawn order for each participant (spec 029-2/2). */
	randomizeAnswers: boolean;
}

/** A creator who never assigned (RN-14). */
export const DEFAULT_ASSIGNMENT_OPTIONS: AssignmentOptions = {
	gameCharacters: false,
	questionTimer: true,
	randomizeAnswers: false,
};

export class AssignmentDeadlinePassedError extends DomainError {
	readonly code = "ASSIGNMENT.DEADLINE_PASSED";
}

export class AssignmentDeadlineTooFarError extends DomainError {
	readonly code = "ASSIGNMENT.DEADLINE_TOO_FAR";
}

/**
 * Later than now and at most `maxDays` ahead, by the server's clock (RN-08).
 * The whole hour is the screen's: the server does not know the device's zone.
 */
export function assertAssignmentDeadline(
	deadline: Date,
	now: Date,
	maxDays: number,
): void {
	if (deadline.getTime() <= now.getTime()) {
		throw new AssignmentDeadlinePassedError("The deadline has passed");
	}
	if (deadline.getTime() > now.getTime() + maxDays * DAY_MS) {
		throw new AssignmentDeadlineTooFarError(
			`The deadline must be at most ${maxDays} days ahead`,
		);
	}
}

/**
 * The game of an assignment (ADR 0014): playing from its creation, with no
 * stage of the live game, and with its questions already counted, since they
 * are copied now (RN-04). Questions and answers always show on the devices,
 * and the questions are never shuffled (RN-15).
 */
export function newAssignment(input: {
	id: string;
	ownerId: string;
	quizId: string;
	quizVersion: number;
	title: string;
	pin: string;
	deadline: Date;
	options: AssignmentOptions;
	questionCount: number;
	now: Date;
}): Game {
	return {
		id: input.id,
		mode: "assignment",
		ownerId: input.ownerId,
		quizId: input.quizId,
		quizVersion: input.quizVersion,
		title: input.title,
		pin: input.pin,
		status: "playing",
		locked: false,
		options: {
			showQuestionsOnDevices: true,
			randomizeQuestions: false,
			randomizeAnswers: input.options.randomizeAnswers,
			autoplay: false,
			gameCharacters: input.options.gameCharacters,
		},
		questionTimer: input.options.questionTimer,
		autoplaySince: null,
		createdAt: input.now,
		startedAt: input.now,
		expiresAt: input.deadline,
		endedAt: null,
		endReason: null,
		questionCount: input.questionCount,
		progress: null,
		hostSeenAt: input.now,
	};
}

/** Earlier or later, while it is open (RN-36 to RN-38). */
export function changeAssignmentDeadline(
	game: Game,
	deadline: Date,
	now: Date,
	maxDays: number,
): Game {
	requireAssignment(game);
	assertGameOpen(game);
	assertAssignmentDeadline(deadline, now, maxDays);
	return { ...game, expiresAt: deadline };
}

/** The options an assignment was created with. */
export function assignmentOptionsOf(game: Game): AssignmentOptions {
	return {
		gameCharacters: game.options.gameCharacters,
		questionTimer: game.questionTimer,
		randomizeAnswers: game.options.randomizeAnswers,
	};
}
