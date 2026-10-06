import type {
	ReportGameQuery,
	ReportHeaderCriteria,
	ReportTally,
} from "../application/ports/report-game-query";
import type { ReportRepository } from "../application/ports/report-repository";
import { playedQuestionCount, type ReportHeader } from "../domain/report";
import type { ReportGame } from "../domain/report-game";

/** Copies, so a test cannot change what is stored by keeping a reference. */
function copyHeader(header: ReportHeader): ReportHeader {
	return {
		...header,
		quiz: header.quiz && { ...header.quiz },
		stoppedAt: header.stoppedAt && { ...header.stoppedAt },
	};
}

function copyGame(game: ReportGame): ReportGame {
	return {
		header: copyHeader(game.header),
		participants: game.participants.map((participant) => ({ ...participant })),
		questions: game.questions.map((question) => ({
			...question,
			choices: question.choices.map((choice) => ({ ...choice })),
		})),
		answers: game.answers.map((answer) => ({
			...answer,
			choiceIds: [...answer.choiceIds],
		})),
	};
}

/**
 * Both reports ports over a list of games that already are reports: which
 * game becomes one is the adapter's part of the contract, checked against the
 * database. Give it games as they were stored, and it cuts them to the played
 * questions as the contract asks.
 */
export class InMemoryReportStore implements ReportGameQuery, ReportRepository {
	readonly #games = new Map<string, ReportGame>();

	constructor(games: readonly ReportGame[] = []) {
		for (const game of games) {
			this.put(game);
		}
	}

	put(game: ReportGame): void {
		this.#games.set(game.header.gameId, copyGame(game));
	}

	async listHeaders({
		ownerId,
		section,
	}: ReportHeaderCriteria): Promise<ReportHeader[]> {
		return [...this.#games.values()]
			.map(({ header }) => header)
			.filter(
				(header) =>
					header.ownerId === ownerId &&
					(header.trashedAt !== null) === (section === "trash"),
			)
			.sort(
				(a, b) =>
					b.endedAt.getTime() - a.endedAt.getTime() ||
					a.gameId.localeCompare(b.gameId),
			)
			.map((header) => copyHeader(header));
	}

	async findHeader(gameId: string, _now?: Date): Promise<ReportHeader | null> {
		const game = this.#games.get(gameId);
		return game ? copyHeader(game.header) : null;
	}

	async tallies(headers: readonly ReportHeader[]): Promise<ReportTally[]> {
		return headers.flatMap(({ gameId }) => {
			const game = this.#played(gameId);
			return game
				? [
						{
							gameId,
							participantFirstQuestions: game.participants.map(
								(participant) => participant.firstQuestionIndex,
							),
							correctAnswers: game.answers.filter(
								(answer) => answer.correctness === "correct",
							).length,
						},
					]
				: [];
		});
	}

	async findGame(gameId: string, _now?: Date): Promise<ReportGame | null> {
		return this.#played(gameId);
	}

	async saveName(gameId: string, name: string): Promise<void> {
		const game = this.#games.get(gameId);
		if (game) {
			game.header.name = name;
		}
	}

	async saveTrashed(
		gameIds: readonly string[],
		at: Date | null,
	): Promise<void> {
		for (const gameId of gameIds) {
			const game = this.#games.get(gameId);
			if (game) {
				game.header.trashedAt = at;
			}
		}
	}

	async delete(gameIds: readonly string[]): Promise<void> {
		for (const gameId of gameIds) {
			this.#games.delete(gameId);
		}
	}

	#played(gameId: string): ReportGame | null {
		const stored = this.#games.get(gameId);
		if (!stored) {
			return null;
		}
		const game = copyGame(stored);
		const played = playedQuestionCount(game.header);
		return {
			...game,
			questions: game.questions.filter(({ index }) => index < played),
			answers: game.answers.filter(
				({ questionIndex }) => questionIndex < played,
			),
		};
	}
}
