import type { Answer } from "../domain/answer";
import type { GameChoice, GameQuestion } from "../domain/game-question";

/** Test builder: answers at the first positions; the ones in `correct` are right. */
export function someChoices(
	texts: readonly string[],
	correct: readonly number[] = [0],
): GameChoice[] {
	return texts.map((text, index) => ({
		id: `choice-${index + 1}`,
		shapeIndex: index,
		text,
		correct: correct.includes(index),
	}));
}

/** Test builder: a single-selection quiz question of 20 s whose first answer is right. */
export function aGameQuestion(
	overrides: Partial<GameQuestion> = {},
): GameQuestion {
	return {
		index: 0,
		type: "quiz",
		text: "Qual é a capital do Brasil?",
		timeLimitSeconds: 20,
		points: "standard",
		selection: "single",
		choices: someChoices(["Brasília", "Rio de Janeiro", "Salvador", "Recife"]),
		image: null,
		...overrides,
	};
}

/** Test builder: player-1's right answer to the first question of game-1. */
export function anAnswer(overrides: Partial<Answer> = {}): Answer {
	return {
		gameId: "game-1",
		questionIndex: 0,
		playerId: "player-1",
		choiceIds: ["choice-1"],
		responseTimeMs: 4_200,
		correctness: "correct",
		receivedAt: new Date("2026-06-01T12:00:04.200Z"),
		...overrides,
	};
}
