import type { AnswerRepository } from "../application/ports/answer-repository";
import type { GameRepository } from "../application/ports/game-repository";
import type { ReviewResultsWriter } from "../application/ports/review-results-writer";

/**
 * The review's two writes over the in-memory repositories. Nothing runs in
 * between in memory; `failRegradeOnce` fakes the regrade failing midway, so a
 * test can tell the stage write is undone with it.
 */
export class InMemoryReviewResultsWriter implements ReviewResultsWriter {
	failRegradeOnce = false;

	constructor(
		private readonly games: GameRepository,
		private readonly answers: Pick<AnswerRepository, "regrade">,
	) {}

	async advanceAndRegrade({
		next,
		from,
		questionIndex,
		regrades,
		reviewedAt,
	}: Parameters<ReviewResultsWriter["advanceAndRegrade"]>[0]) {
		const before = await this.games.findById(next.id);
		if (!(await this.games.saveIfAt(next, from))) {
			return false;
		}
		if (this.failRegradeOnce) {
			this.failRegradeOnce = false;
			// As a rolled back transaction: the stage goes back too.
			if (before) {
				await this.games.save(before);
			}
			throw new Error("The regrade failed");
		}
		await this.answers.regrade(next.id, questionIndex, regrades, reviewedAt);
		return true;
	}
}
