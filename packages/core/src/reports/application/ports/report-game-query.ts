import type { ReportHeader, ReportSection } from "../../domain/report";
import type { ReportGame } from "../../domain/report-game";

export interface ReportHeaderCriteria {
	ownerId: string;
	section: ReportSection;
	/** The server's clock: a game past its deadline is over (spec 008, RN-11). */
	now: Date;
}

/** What the list needs to work out a game's accuracy, without its answers. */
export interface ReportTally {
	gameId: string;
	/** `firstQuestionIndex` of each participant. */
	participantFirstQuestions: number[];
	/** Right answers to played questions. */
	correctAnswers: number;
}

/**
 * Read model of the live games as the reports show them (spec 015; ADR 0010).
 * Contract:
 * - a game is a report when it started and is over: it ended, or its deadline
 *   passed, in which case it ended at the deadline, where it was (RN-01,
 *   RN-02). A game still in the lobby, or being played, is not one;
 * - `name` is the report's own name, or the game's title (RN-45);
 * - participants are the players who were not removed, in order of arrival;
 * - questions and answers are only the played ones (RN-09);
 * - `listHeaders`: only games of `ownerId`; `reports` out of the trash and
 *   `trash` in it; by `endedAt` desc, ties broken by `gameId`.
 */
export interface ReportGameQuery {
	listHeaders(criteria: ReportHeaderCriteria): Promise<ReportHeader[]>;
	/** Whoever owns it: the use case checks the owner. */
	findHeader(gameId: string, now: Date): Promise<ReportHeader | null>;
	/** One tally per header, in any order. */
	tallies(headers: readonly ReportHeader[]): Promise<ReportTally[]>;
	findGame(gameId: string, now: Date): Promise<ReportGame | null>;
}
