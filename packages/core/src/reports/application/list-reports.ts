import type { Clock } from "../../shared/application/ports/clock";
import { normalizeSearchText } from "../../shared/domain/search-text";
import { accuracyPercent } from "../domain/accuracy";
import {
	endedEarly,
	playedQuestionCount,
	type ReportSection,
} from "../domain/report";
import { overallAccuracy } from "../domain/report-stats";
import type { ReportGameQuery } from "./ports/report-game-query";
import { coverUrlOf, type ImageUrlResolver, quizLinksOf } from "./report-view";

/** One line of the reports' list (spec 015, RN-24). */
export interface ReportListItem {
	gameId: string;
	name: string;
	coverUrl: string | null;
	/** How many questions the game had. */
	questionCount: number;
	participantCount: number;
	/** Null when no question reached its results (RN-25). */
	accuracyPercent: number | null;
	endedEarly: boolean;
	endedAt: Date;
	trashedAt: Date | null;
	/** Null when the quiz cannot be opened (RN-05). */
	quizId: string | null;
	canPlayAgain: boolean;
}

export interface ListReportsInput {
	ownerId: string;
	section: ReportSection;
	search?: string | null;
	/** How many to list, from the newest (RN-28). */
	limit: number;
}

export interface ReportList {
	items: ReportListItem[];
	/** How many the section has for this search, whatever the limit. */
	total: number;
}

export type ListReports = (input: ListReportsInput) => Promise<ReportList>;

export function createListReports(deps: {
	reportGames: ReportGameQuery;
	storage: ImageUrlResolver;
	clock: Clock;
}): ListReports {
	return async ({ ownerId, section, search, limit }) => {
		const headers = await deps.reportGames.listHeaders({
			ownerId,
			section,
			now: deps.clock.now(),
		});
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
		const tallies = new Map(
			(await deps.reportGames.tallies(page)).map((tally) => [
				tally.gameId,
				tally,
			]),
		);

		return {
			total: matching.length,
			items: page.map((header) => {
				const tally = tallies.get(header.gameId);
				const firstQuestions = tally?.participantFirstQuestions ?? [];
				return {
					gameId: header.gameId,
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
					...quizLinksOf(header),
				};
			}),
		};
	};
}
