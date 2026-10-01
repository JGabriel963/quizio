import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import { GameEndedError, requireOwnedGame } from "../domain/game";
import {
	isAtStage,
	isPlaying,
	nextStage,
	type StageRef,
} from "../domain/game-progress";
import { loadGame, publishStage } from "./game-lifecycle";
import {
	type HostGameView,
	type HostGameViewDeps,
	loadHostGameView,
} from "./host-game-view";
import type { GameRepository } from "./ports/game-repository";

export type AdvanceGame = (input: {
	ownerId: string;
	gameId: string;
	/** The stage the host's screen was showing when it asked. */
	from: StageRef;
	/** "Pular o cronômetro": ends the answers before the time. */
	skip?: boolean;
}) => Promise<HostGameView>;

/**
 * Moves a game to its next stage (spec 009, RN-10 to RN-12). The host's screen
 * asks for every transition; the server checks the deadline by its own clock
 * and applies it once: a request from a stage the game has already left
 * changes nothing and gets the current view.
 */
export function createAdvanceGame(
	deps: HostGameViewDeps & {
		games: GameRepository;
		realtime: RealtimePublisher;
	},
): AdvanceGame {
	return async ({ ownerId, gameId, from, skip = false }) => {
		const game = requireOwnedGame(await loadGame(deps, gameId), ownerId);
		if (game.status === "finished" || game.status === "ended") {
			throw new GameEndedError("The game is over");
		}
		if (!isAtStage(game, from)) {
			return loadHostGameView(deps, game);
		}

		const current =
			from.phase === "gameIntro"
				? null
				: await deps.gameQuestions.find(game.id, from.questionIndex);
		const next = nextStage(game, {
			timeLimitSeconds: current?.timeLimitSeconds ?? 0,
			skip,
			now: deps.clock.now(),
		});
		if (!(await deps.games.saveIfAt(next, from))) {
			// Another request (a second tab, the last answer) moved it first.
			const latest = await loadGame(deps, game.id);
			return loadHostGameView(deps, latest ?? game);
		}

		const question = !isPlaying(next)
			? null
			: next.progress.questionIndex === current?.index
				? current
				: await deps.gameQuestions.find(game.id, next.progress.questionIndex);
		await publishStage(deps.realtime, next, question);
		return loadHostGameView(deps, next, question);
	};
}
