import { DomainError } from "../../shared/domain/domain-error";
import type { Game } from "./game";
import type { GameQuestion } from "./game-question";

/**
 * Where a participant of an assignment is (spec 030; ADR 0014, "Andamento por
 * participante"): every participant has their own, unlike a live game, whose
 * stage is the game's.
 */
export const PARTICIPANT_PHASES = [
	"ready",
	"answering",
	"results",
	"scoreboard",
	"finished",
] as const;
export type ParticipantPhase = (typeof PARTICIPANT_PHASES)[number];

export interface ParticipantProgress {
	/** 0 while ready; the last question once finished. */
	questionIndex: number;
	phase: ParticipantPhase;
	/**
	 * When the screen began. While answering, the time of the question counts
	 * from here, by the server's clock (RN-09).
	 */
	startedAt: Date;
}

/** An answer or an advance from a screen the participant is not on (RN-12, RN-13). */
export class ParticipantNotAtStageError extends DomainError {
	readonly code = "ASSIGNMENT.NOT_AT_STAGE";
}

/**
 * On joining: the first question at once (RN-05), or first the character with
 * "Personagens" on (RN-06).
 */
export function firstProgress(game: Game, now: Date): ParticipantProgress {
	return {
		questionIndex: 0,
		phase: game.options.gameCharacters ? "ready" : "answering",
		startedAt: now,
	};
}

/** When the answers to the question close; null without the question timer (RN-09). */
export function answerDeadline(
	game: Game,
	question: GameQuestion,
	progress: ParticipantProgress,
): Date | null {
	if (!game.questionTimer || progress.phase !== "answering") {
		return null;
	}
	return new Date(
		progress.startedAt.getTime() + question.timeLimitSeconds * 1000,
	);
}

/**
 * A question whose time ran out goes to its results, at the deadline (RN-21):
 * no timer does it; whoever reads or writes does. The same progress otherwise.
 */
export function settleProgress(
	game: Game,
	question: GameQuestion,
	progress: ParticipantProgress,
	now: Date,
): ParticipantProgress {
	const deadline = answerDeadline(game, question, progress);
	return deadline && now.getTime() >= deadline.getTime()
		? { ...progress, phase: "results", startedAt: deadline }
		: progress;
}

/** The screen after this one (RN-12): finished stays finished. */
export function nextProgress(
	progress: ParticipantProgress,
	questionCount: number,
	now: Date,
): ParticipantProgress {
	const { questionIndex } = progress;
	switch (progress.phase) {
		case "ready":
			return { questionIndex: 0, phase: "answering", startedAt: now };
		case "answering":
			return { questionIndex, phase: "results", startedAt: now };
		case "results":
			return { questionIndex, phase: "scoreboard", startedAt: now };
		case "scoreboard":
			return questionIndex + 1 < questionCount
				? {
						questionIndex: questionIndex + 1,
						phase: "answering",
						startedAt: now,
					}
				: { questionIndex, phase: "finished", startedAt: now };
		case "finished":
			return progress;
	}
}

/** The assignment is over with the participant in the middle (RN-23). */
export function finishProgress(
	progress: ParticipantProgress,
	now: Date,
): ParticipantProgress {
	return progress.phase === "finished"
		? progress
		: { ...progress, phase: "finished", startedAt: now };
}

/** The same screen: what an advance or an answer says it leaves from. */
export function isAtProgress(
	progress: ParticipantProgress,
	at: { questionIndex: number; phase: ParticipantPhase },
): boolean {
	return (
		progress.questionIndex === at.questionIndex && progress.phase === at.phase
	);
}
