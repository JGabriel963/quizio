import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import {
	GameQuizNotFoundError,
	isGameOpen,
	newGame,
	QuizNotPlayableError,
} from "../domain/game";
import { DEFAULT_GAME_OPTIONS } from "../domain/game-options";
import { createEndGamesOfQuiz } from "./end-games-of-quiz";
import { settleGame } from "./game-lifecycle";
import type { GamePinGenerator } from "./ports/game-pin-generator";
import type { GameRepository } from "./ports/game-repository";
import type { HostPreferencesRepository } from "./ports/host-preferences-repository";
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
	preferences: Pick<HostPreferencesRepository, "find">;
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

		// The game starts as the host left the settings last time (spec 012, RN-05).
		const options =
			(await deps.preferences.find(ownerId)) ?? DEFAULT_GAME_OPTIONS;

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
				options,
				now: deps.clock.now(),
			});
			if ((await deps.games.create(game)) === "created") {
				return { gameId: game.id };
			}
			// Another request got there first, with this PIN or for this quiz:
			// the last game to be asked for is the one that stays (RN-07).
			await endGamesOfQuiz({ quizId: quiz.id, reason: "replaced" });
		}
		throw new Error("Could not draw a free game PIN");
	};
}
