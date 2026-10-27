import type { GameMode } from "../../game/domain/game";
import type { Clock } from "../../shared/application/ports/clock";
import type { QuizShareGrants } from "../../shared/application/ports/quiz-share-grants";
import { normalizeSearchText } from "../../shared/domain/search-text";
import { accuracyPercent } from "../domain/accuracy";
import {
	endedEarly,
	playedQuestionCount,
	type ReportSection,
} from "../domain/report";
import { overallAccuracy } from "../domain/report-stats";
import type { ReportGameQuery } from "./ports/report-game-query";
import {
	assignmentPartOf,
	coverUrlOf,
	type ImageUrlResolver,
	NO_QUIZ_LINKS,
	quizLinksFor,
} from "./report-view";

/** One line of the reports' list (spec 015, RN-24). */
export interface ReportListItem {
	gameId: string;
	/** A live game or an assignment (spec 029, RN-29). */
	mode: GameMode;
	/** An assignment before its deadline. */
	open: boolean;
	/** Until an open assignment's deadline; null otherwise. */
	remainingMs: number | null;
	name: string;
	coverUrl: string | null;
	/** How many questions the game had. */
	questionCount: number;
	participantCount: number;
	/** Null when no question reached its results (RN-25). */
	accuracyPercent: number | null;
	endedEarly: boolean;
	endedAt: Date | null;
	trashedAt: Date | null;
	/** Null when the quiz cannot be opened (RN-05). */
	quizId: string | null;
	canPlayAgain: boolean;
	/** Spec 037, RN-24. */
	playQuizId: string | null;
}

export interface ListReportsInput {
	ownerId: string;
	section: ReportSection;
	search?: string | null;
	/** Only the games of this quiz: its page's numbers and activities. */
	quizId?: string | null;
	/** How many to list, from the newest (RN-28). */
	limit: number;
}

export interface ReportList {
	items: ReportListItem[];
	/** How many the section has for this search, whatever the limit. */
	total: number;
	/**
	 * With `quizId` only: the participants of all the quiz's reports, whatever
	 * the limit (the quiz page's "N participantes").
	 */
	participants?: number;
}

export type ListReports = (input: ListReportsInput) => Promise<ReportList>;

export function createListReports(deps: {
	reportGames: ReportGameQuery;
	storage: ImageUrlResolver;
	clock: Clock;
	/** Quizzes of others the reader plays again (spec 037); none when absent. */
	quizShareGrants?: QuizShareGrants;
}): ListReports {
	return async ({ ownerId, section, search, quizId, limit }) => {
		const now = deps.clock.now();
		const headers = (
			await deps.reportGames.listHeaders({ ownerId, section, now })
		).filter((header) => !quizId || header.quizId === quizId);
		// A report's name is almost always its game's title, so the search runs
		// here, over the headers, in place of a stored search column (RN-27).
		const searchText = normalizeSearchText(search ?? "");
		const matching =
			searchText === ""
				? headers
				: headers.filter((header) =>
						normalizeSearchText(header.name).includes(searchText),
					);
		const page = matching.slice(0, limit);
		// One quiz's games are few: its page counts everybody, past the limit.
		const tallies = new Map(
			(await deps.reportGames.tallies(quizId ? matching : page)).map(
				(tally) => [tally.gameId, tally],
			),
		);

		const links = await Promise.all(
			page.map((header) => quizLinksFor(deps.quizShareGrants, header, ownerId)),
		);

		return {
			total: matching.length,
			...(quizId && {
				participants: matching.reduce(
					(sum, header) =>
						sum +
						(tallies.get(header.gameId)?.participantFirstQuestions.length ?? 0),
					0,
				),
			}),
			items: page.map((header, index) => {
				const tally = tallies.get(header.gameId);
				const firstQuestions = tally?.participantFirstQuestions ?? [];
				const assignment = assignmentPartOf(header, now);
				return {
					gameId: header.gameId,
					mode: header.mode,
					open: assignment?.open ?? false,
					remainingMs: assignment?.remainingMs ?? null,
					name: header.name,
					coverUrl: coverUrlOf(header, deps.storage),
					questionCount: header.questionCount,
					participantCount: firstQuestions.length,
					accuracyPercent: accuracyPercent(
						overallAccuracy(
							firstQuestions.map((firstQuestionIndex) => ({
								firstQuestionIndex,
							})),
							playedQuestionCount(header),
							tally?.correctAnswers ?? 0,
						),
					),
					endedEarly: endedEarly(header),
					endedAt: header.endedAt,
					trashedAt: header.trashedAt,
					...(links[index] ?? NO_QUIZ_LINKS),
				};
			}),
		};
	};
}
