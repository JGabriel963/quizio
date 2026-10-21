import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import { normalizeTypedAnswer } from "../../shared/domain/typed-answer";
import { reviewedPoints } from "../domain/answer";
import { nextStage } from "../domain/game-progress";
import {
	parseReviewChanges,
	type ReviewChange,
	ReviewNotAvailableError,
	typedAnswerGroupsOf,
} from "../domain/typed-answer-review";
import { type AnswerReviewInput, loadReviewableResults } from "./answer-review";
import { publishStage } from "./game-lifecycle";
import {
	type HostGameView,
	type HostGameViewDeps,
	loadHostGameView,
} from "./host-game-view";
import type { AnswerRepository } from "./ports/answer-repository";
import type { GameRepository } from "./ports/game-repository";

export type ReviewTypedAnswers = (
	input: AnswerReviewInput & { changes: ReviewChange[] },
) => Promise<HostGameView>;

/**
 * "Enviar" of the review (spec 031, RN-29, RN-30, RN-30a): the answers the host
 * marked are graded again and the game moves on to the scoreboard, or the
 * podium after the last question.
 *
 * It moves on first, with the same conditional write as any advance: of two
 * requests only one gets through, and only that one grades again. So the
 * grade of a question never changes after the game left its results (RN-26).
 */
export function createReviewTypedAnswers(
	deps: HostGameViewDeps & {
		games: GameRepository;
		answers: Pick<AnswerRepository, "regrade">;
		realtime: RealtimePublisher;
	},
): ReviewTypedAnswers {
	return async ({ changes, ...input }) => {
		const { game, question } = await loadReviewableResults(deps, input);
		const answers = await deps.answers.listByQuestion(game.id, question.index);
		const marked = parseReviewChanges(
			typedAnswerGroupsOf(question, answers),
			changes,
		);

		const now = deps.clock.now();
		const next = nextStage(game, {
			timeLimitSeconds: question.timeLimitSeconds,
			skip: false,
			review: true,
			now,
		});
		if (!(await deps.games.saveIfAt(next, input.from))) {
			throw new ReviewNotAvailableError("The game already moved on");
		}

		const correctByKey = new Map(
			marked.map((change) => [change.key, change.correct]),
		);
		const regrades = answers.flatMap((answer) => {
			const correct =
				answer.text === null
					? undefined
					: correctByKey.get(normalizeTypedAnswer(answer.text));
			return correct === undefined
				? []
				: [
						{
							playerId: answer.playerId,
							correctness: correct ? ("correct" as const) : ("wrong" as const),
							points: reviewedPoints(question, correct, answer.responseTimeMs),
						},
					];
		});
		if (regrades.length > 0) {
			await deps.answers.regrade(game.id, question.index, regrades, now);
		}

		// The scoreboard and the podium show no question. The event goes out only
		// now, so every screen that asks again gets the new points.
		await publishStage(deps, next, null);
		return loadHostGameView(deps, next, null);
	};
}
