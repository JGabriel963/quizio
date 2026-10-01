import type { Question } from "../../quiz/domain/question";
import { aQuestion, aTrueFalseQuestion } from "../../quiz/testing/a-question";
import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryAttemptLimiter } from "../../shared/testing/in-memory-attempt-limiter";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { InMemoryRealtimePublisher } from "../../shared/testing/in-memory-realtime-publisher";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import type { PlayableQuiz } from "../application/ports/playable-quiz-query";
import { InMemoryAnswerRepository } from "./in-memory-answer-repository";
import { InMemoryGameQuestionRepository } from "./in-memory-game-question-repository";
import { InMemoryGameRepository } from "./in-memory-game-repository";
import {
	aPlayableQuiz,
	InMemoryPlayableQuizQuery,
} from "./in-memory-playable-quiz-query";
import { InMemoryPlayerRepository } from "./in-memory-player-repository";
import { SequentialGamePinGenerator } from "./sequential-game-pin-generator";

/**
 * Test data: a playable version of two questions, a quiz one of 20 s whose
 * first answer is right and a true/false one of 10 s that is true.
 */
export function somePlayableQuestions(): Question[] {
	return [
		aQuestion({
			id: "question-1",
			choices: ["Brasília", "Rio de Janeiro", "Salvador", "Recife"].map(
				(text, index) => ({
					id: `choice-${index + 1}`,
					text,
					correct: index === 0,
				}),
			),
		}),
		aTrueFalseQuestion({
			id: "question-2",
			timeLimitSeconds: 10,
			correct: true,
		}),
	];
}

/** Every port of the game context, in memory, for use-case tests. */
export function createGameDeps(
	options: {
		quizzes?: PlayableQuiz[];
		pins?: string[];
		/** The questions of version 1 of every quiz. */
		questions?: Question[];
	} = {},
) {
	const quizzes = options.quizzes ?? [aPlayableQuiz()];
	/** Questions of each playable version, by its number. */
	const versionQuestions = new Map<number, Question[]>([
		[1, options.questions ?? somePlayableQuestions()],
	]);
	return {
		quizzes,
		versionQuestions,
		playableQuizzes: new InMemoryPlayableQuizQuery(
			() => quizzes,
			(_quizId, version) => versionQuestions.get(version) ?? [],
		),
		games: new InMemoryGameRepository(),
		players: new InMemoryPlayerRepository(),
		gameQuestions: new InMemoryGameQuestionRepository(),
		answers: new InMemoryAnswerRepository(),
		pins: new SequentialGamePinGenerator(...(options.pins ?? ["265914"])),
		attempts: new InMemoryAttemptLimiter(),
		storage: new InMemoryObjectStorage("https://media.test"),
		ids: new SequentialIdGenerator("id"),
		clock: new FixedClock("2026-06-01T12:00:00.000Z"),
		realtime: new InMemoryRealtimePublisher(),
	};
}
