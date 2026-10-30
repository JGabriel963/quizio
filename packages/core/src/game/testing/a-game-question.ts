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
		textFormatting: {},
		timeLimitSeconds: 20,
		points: "standard",
		selection: "single",
		choices: someChoices(["Brasília", "Rio de Janeiro", "Salvador", "Recife"]),
		acceptedAnswers: [],
		slider: null,
		correctOrder: [],
		image: null,
		...overrides,
	};
}

/** Test builder: a slider of 20 s, 100 to 900 with 600 "anos" and the medium margin. */
export function aSliderGameQuestion(
	overrides: Partial<GameQuestion> = {},
): GameQuestion {
	return aGameQuestion({
		type: "slider",
		text: "Quantos anos tinha Noé quando o dilúvio acabou?",
		choices: [],
		slider: { min: 100, max: 900, answer: 600, margin: "medium", unit: "anos" },
		...overrides,
	});
}

/** Test builder: player-1's right answer to the first question of game-1. */
export function anAnswer(overrides: Partial<Answer> = {}): Answer {
	return {
		gameId: "game-1",
		questionIndex: 0,
		playerId: "player-1",
		choiceIds: ["choice-1"],
		text: null,
		value: null,
		responseTimeMs: 4_200,
		correctness: "correct",
		points: 895,
		receivedAt: new Date("2026-06-01T12:00:04.200Z"),
		reviewedAt: null,
		...overrides,
	};
}

/**
 * Test builder: a puzzle of four rivers, copied in the right order (choice-1
 * to choice-4) and not shuffled yet (spec 033).
 */
export function aPuzzleGameQuestion(
	overrides: Partial<GameQuestion> = {},
): GameQuestion {
	const choices = someChoices(
		["Nilo", "Amazonas", "Yangtzé", "Mississipi"],
		[0, 1, 2, 3],
	);
	return aGameQuestion({
		type: "puzzle",
		text: "Coloque estes rios do maior para o menor",
		timeLimitSeconds: 60,
		choices,
		correctOrder: choices.map(({ id }) => id),
		...overrides,
	});
}
