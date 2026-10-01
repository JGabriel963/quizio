import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryAttemptLimiter } from "../../shared/testing/in-memory-attempt-limiter";
import { InMemoryRealtimePublisher } from "../../shared/testing/in-memory-realtime-publisher";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import type { PlayableQuiz } from "../application/ports/playable-quiz-query";
import { InMemoryGameRepository } from "./in-memory-game-repository";
import {
	aPlayableQuiz,
	InMemoryPlayableQuizQuery,
} from "./in-memory-playable-quiz-query";
import { InMemoryPlayerRepository } from "./in-memory-player-repository";
import { SequentialGamePinGenerator } from "./sequential-game-pin-generator";

/** Every port of the game context, in memory, for use-case tests. */
export function createGameDeps(
	options: { quizzes?: PlayableQuiz[]; pins?: string[] } = {},
) {
	const quizzes = options.quizzes ?? [aPlayableQuiz()];
	return {
		quizzes,
		playableQuizzes: new InMemoryPlayableQuizQuery(() => quizzes),
		games: new InMemoryGameRepository(),
		players: new InMemoryPlayerRepository(),
		pins: new SequentialGamePinGenerator(...(options.pins ?? ["265914"])),
		attempts: new InMemoryAttemptLimiter(),
		ids: new SequentialIdGenerator("id"),
		clock: new FixedClock("2026-06-01T12:00:00.000Z"),
		realtime: new InMemoryRealtimePublisher(),
	};
}
