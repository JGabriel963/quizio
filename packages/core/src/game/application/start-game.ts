import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import type { Shuffler } from "../../shared/application/ports/shuffler";
import { autoStartRemainingMs } from "../domain/autoplay";
import { QuizNotPlayableError, requireOwnedGame } from "../domain/game";
import {
	isPlaying,
	StageNotDueError,
	startGame,
} from "../domain/game-progress";
import { arrangeGameQuestions } from "../domain/game-question";
import { loadGame, publishStage } from "./game-lifecycle";
import {
	type HostGameView,
	type HostGameViewDeps,
	loadHostGameView,
} from "./host-game-view";
import type { GameQuestionRepository } from "./ports/game-question-repository";
import type { GameRepository } from "./ports/game-repository";
import type { PlayableQuizQuery } from "./ports/playable-quiz-query";
import type { PlayerRepository } from "./ports/player-repository";

export type StartGame = (input: {
	ownerId: string;
	gameId: string;
	/**
	 * Autoplay's countdown ran out on the host's screen (spec 014, RN-05). The
	 * server checks it by its own clock: a player may have joined at the last
	 * moment, which starts the countdown over.
	 */
	auto?: boolean;
}) => Promise<HostGameView>;

/**
 * "Iniciar" (spec 009, RN-01 to RN-04). The questions of the playable version
 * the game was created with are copied into the game, which never reads the
 * quiz again (RN-29). The random orders are drawn here, once, so every
 * screen and every reload reads the same one (spec 012, RN-22, RN-23, RN-26).
 */
export function createStartGame(
	deps: HostGameViewDeps & {
		games: GameRepository;
		players: Pick<
			PlayerRepository,
			"listActive" | "countActive" | "lastJoinedAt"
		>;
		playableQuizzes: Pick<PlayableQuizQuery, "questions">;
		gameQuestions: GameQuestionRepository;
		shuffler: Shuffler;
		realtime: RealtimePublisher;
	},
): StartGame {
	return async ({ ownerId, gameId, auto = false }) => {
		const game = requireOwnedGame(await loadGame(deps, gameId), ownerId);
		if (isPlaying(game)) {
			// A repeated request: the game goes on from where it is.
			return loadHostGameView(deps, game);
		}
		if (auto && game.status === "lobby") {
			const remaining = autoStartRemainingMs(
				game,
				{
					activePlayers: await deps.players.countActive(game.id),
					lastJoinedAt: await deps.players.lastJoinedAt(game.id),
				},
				deps.clock.now(),
			);
			if (remaining === null || remaining > 0) {
				throw new StageNotDueError(
					remaining === null
						? "The lobby is not counting down to start"
						: `The lobby has ${remaining} ms left`,
				);
			}
		}

		const questions = arrangeGameQuestions(
			await deps.playableQuizzes.questions(game.quizId, game.quizVersion),
			game.options,
			(items) => deps.shuffler.shuffle(items),
		);
		const started = startGame(game, {
			playerCount: await deps.players.countActive(game.id),
			questionCount: questions.length,
			now: deps.clock.now(),
		});
		if (questions.length === 0) {
			throw new QuizNotPlayableError("The playable version has no questions");
		}

		await deps.gameQuestions.saveAll(game.id, questions);
		if (!(await deps.games.saveIfAt(started, null))) {
			// Another request started or ended it first.
			const current = await loadGame(deps, game.id);
			return loadHostGameView(deps, current ?? game);
		}
		await publishStage(deps, started, null);
		return loadHostGameView(deps, started);
	};
}
