import type { TypedAnswerGroup } from "../../shared/domain/typed-answer";
import { type Game, requireOwnedGame } from "../domain/game";
import { isAtStage, type StageRef } from "../domain/game-progress";
import type { GameQuestion } from "../domain/game-question";
import {
	isSimilarAnswer,
	ReviewNotAvailableError,
	typedAnswerGroupsOf,
} from "../domain/typed-answer-review";
import { loadLiveGame } from "./game-lifecycle";
import {
	type HostGameView,
	type HostGameViewDeps,
	loadHostGameView,
} from "./host-game-view";
import type { GameRepository } from "./ports/game-repository";

export interface AnswerReviewInput {
	ownerId: string;
	gameId: string;
	/** The results the host's screen is showing. */
	from: StageRef;
}

type ReviewDeps = HostGameViewDeps & { games: GameRepository };

/**
 * The host's own game, showing the results of a type answer: the only place
 * the typed answers can be reviewed (spec 031, RN-26).
 */
export async function loadReviewableResults(
	deps: ReviewDeps,
	input: AnswerReviewInput,
): Promise<{ game: Game; question: GameQuestion }> {
	const game = requireOwnedGame(
		await loadLiveGame(deps, input.gameId),
		input.ownerId,
	);
	const question =
		input.from.phase === "results" && isAtStage(game, input.from)
			? await deps.gameQuestions.find(game.id, input.from.questionIndex)
			: null;
	if (question?.type !== "typeAnswer") {
		throw new ReviewNotAvailableError(
			"Only the results of a type answer can be reviewed",
		);
	}
	return { game, question };
}

export type OpenAnswerReview = (
	input: AnswerReviewInput,
) => Promise<HostGameView>;

/**
 * The host opened "Revisar respostas": with autoplay, the results wait
 * (RN-32). Opening what is already open keeps the first instant.
 */
export function createOpenAnswerReview(deps: ReviewDeps): OpenAnswerReview {
	return async (input) => {
		const { game, question } = await loadReviewableResults(deps, input);
		const opened = game.progress?.reviewOpenedAt ?? deps.clock.now();
		await deps.games.saveReview(game.id, input.from, {
			openedAt: opened,
			closedAt: game.progress?.reviewClosedAt ?? null,
		});
		return loadHostGameView(deps, await reloaded(deps, game), question);
	};
}

export type CloseAnswerReview = OpenAnswerReview;

/** "Cancelar": back to the results, whose countdown starts over (RN-32, CA-24). */
export function createCloseAnswerReview(deps: ReviewDeps): CloseAnswerReview {
	return async (input) => {
		const { game, question } = await loadReviewableResults(deps, input);
		await deps.games.saveReview(game.id, input.from, {
			openedAt: null,
			closedAt: deps.clock.now(),
		});
		return loadHostGameView(deps, await reloaded(deps, game), question);
	};
}

async function reloaded(deps: ReviewDeps, game: Game): Promise<Game> {
	return (await deps.games.findById(game.id)) ?? game;
}

export interface TypedAnswerGroupView extends TypedAnswerGroup {
	/** Wrong, and close to a correct answer: shown first (RN-28). */
	similar: boolean;
}

/** Every typed answer of the question, for the review (RN-27). */
export interface TypedAnswersView {
	groups: TypedAnswerGroupView[];
}

export type GetTypedAnswers = (input: {
	ownerId: string;
	gameId: string;
	questionIndex: number;
}) => Promise<TypedAnswersView>;

/**
 * The whole list the review shows, only while the question's results are on
 * the screen: correct ones, then the similar ones, then the rest (RN-27, RN-28).
 */
export function createGetTypedAnswers(deps: ReviewDeps): GetTypedAnswers {
	return async ({ questionIndex, ...game }) => {
		const { question } = await loadReviewableResults(deps, {
			...game,
			from: { questionIndex, phase: "results" },
		});
		const groups = typedAnswerGroupsOf(
			question,
			await deps.answers.listByQuestion(game.gameId, questionIndex),
		);
		const correctKeys = groups
			.filter((group) => group.correct)
			.map((group) => group.key);
		const viewed = groups.map((group) => ({
			...group,
			similar: !group.correct && isSimilarAnswer(group.key, correctKeys),
		}));
		return {
			groups: [
				...viewed.filter((group) => group.correct),
				...viewed.filter((group) => group.similar),
				...viewed.filter((group) => !group.correct && !group.similar),
			],
		};
	};
}
