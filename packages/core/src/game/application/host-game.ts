import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import {
	GameQuizNotFoundError,
	isGameOpen,
	newGame,
	QuizNotPlayableError,
} from "../domain/game";
import { createEndGamesOfQuiz } from "./end-games-of-quiz";
import { settleGame } from "./game-lifecycle";
import type { GamePinGenerator } from "./ports/game-pin-generator";
import type { GameRepository } from "./ports/game-repository";
import type { PlayableQuizQuery } from "./ports/playable-quiz-query";

export type HostGame = (input: {
	ownerId: string;
	quizId: string;
}) => Promise<{ gameId: string }>;

/** Far more than a 900 000 PIN space needs; guards against a broken generator. */
const PIN_DRAWS = 5;

/** "Organizar ao vivo": opens the lobby of a new game (spec 008, RN-01 to RN-09). */
export function createHostGame(deps: {
	playableQuizzes: PlayableQuizQuery;
	games: GameRepository;
	pins: GamePinGenerator;
	ids: IdGenerator;
	clock: Clock;
	realtime: RealtimePublisher;
}): HostGame {
	const endGamesOfQuiz = createEndGamesOfQuiz(deps);

	return async ({ ownerId, quizId }) => {
		const quiz = await deps.playableQuizzes.find(quizId);
		if (!quiz || quiz.ownerId !== ownerId) {
			throw new GameQuizNotFoundError("Quiz not found");
		}
		if (quiz.trashed || quiz.version === null) {
			throw new QuizNotPlayableError(
				"Only a published quiz out of the trash can be hosted",
			);
		}

		// A quiz has one open game: the new one replaces it (RN-07).
		await endGamesOfQuiz({ quizId: quiz.id, reason: "replaced" });

		for (let draw = 0; draw < PIN_DRAWS; draw++) {
			const pin = deps.pins.generate();
			const holder = await deps.games.findUnendedByPin(pin);
			// A game past its deadline frees its PIN as soon as it is settled.
			if (holder && isGameOpen(await settleGame(deps, holder))) {
				continue;
			}
			const game = newGame({
				id: deps.ids.generate(),
				ownerId,
				quizId: quiz.id,
				quizVersion: quiz.version,
				title: quiz.title ?? "",
				pin,
				now: deps.clock.now(),
			});
			if ((await deps.games.create(game)) === "created") {
				return { gameId: game.id };
			}
		}
		throw new Error("Could not draw a free game PIN");
	};
}
