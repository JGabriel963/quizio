import { describe, expect, it } from "vitest";

import { aTrueFalseQuestion } from "../../quiz/testing/a-question";
import { aPlayingGame } from "../testing/a-game";
import { aGameQuestion } from "../testing/a-game-question";
import { DEFAULT_GAME_OPTIONS } from "./game-options";
import type { GamePhase } from "./game-progress";
import { toGameQuestion } from "./game-question";
import { publicStageOf } from "./public-stage";

const urlOf = (key: string) => `https://media.test/${key}`;

const image = {
	key: "quizzes/quiz-1/questions/a.png",
	placement: "media" as const,
	crop: { shape: "square" as const, zoom: 2, x: 0.5, y: 0.25 },
	altText: "Mapa do Brasil",
};

function showing(phase: GamePhase) {
	return aPlayingGame(
		phase,
		{},
		{ options: { ...DEFAULT_GAME_OPTIONS, showQuestionsOnDevices: true } },
	);
}

describe("public stage with the questions on the devices (spec 012)", () => {
	it("sends no text and no image with the option off", () => {
		const stage = publicStageOf(
			aPlayingGame("answering"),
			aGameQuestion({ image }),
			urlOf,
		);

		expect(stage.question).toMatchObject({ text: null, image: null });
		expect(
			stage.question?.choices.every((choice) => choice.text === null),
		).toBe(true);
		expect(JSON.stringify(stage)).not.toMatch(/Brasília|capital|media\.test/);
	});

	it("sends the statement in the question's intro", () => {
		const stage = publicStageOf(
			showing("questionIntro"),
			aGameQuestion({ image }),
			urlOf,
		);

		expect(stage.question?.text).toBe("Qual é a capital do Brasil?");
		// The answers and the image wait for the answers to open, as on the host's screen.
		expect(stage.question?.image).toBeNull();
		expect(
			stage.question?.choices.every((choice) => choice.text === null),
		).toBe(true);
	});

	it("sends the statement, the texts and the image while answering", () => {
		const stage = publicStageOf(
			showing("answering"),
			aGameQuestion({ image }),
			urlOf,
		);

		expect(stage.question).toEqual({
			type: "quiz",
			selection: "single",
			text: "Qual é a capital do Brasil?",
			image: {
				url: "https://media.test/quizzes/quiz-1/questions/a.png",
				placement: "media",
				crop: { shape: "square", zoom: 2, x: 0.5, y: 0.25 },
				altText: "Mapa do Brasil",
			},
			choices: [
				{ id: "choice-1", shapeIndex: 0, label: null, text: "Brasília" },
				{ id: "choice-2", shapeIndex: 1, label: null, text: "Rio de Janeiro" },
				{ id: "choice-3", shapeIndex: 2, label: null, text: "Salvador" },
				{ id: "choice-4", shapeIndex: 3, label: null, text: "Recife" },
			],
		});
	});

	it("true or false sends its two labels", () => {
		const stage = publicStageOf(
			showing("answering"),
			toGameQuestion(aTrueFalseQuestion({ correct: true }), 0),
			urlOf,
		);

		expect(stage.question?.choices).toEqual([
			{ id: "true", shapeIndex: 1, label: "Verdadeiro", text: "Verdadeiro" },
			{ id: "false", shapeIndex: 0, label: "Falso", text: "Falso" },
		]);
	});

	it("tells where the editor placed the image", () => {
		const stage = publicStageOf(
			showing("answering"),
			aGameQuestion({ image: { ...image, placement: "background" } }),
			urlOf,
		);

		expect(stage.question?.image).toEqual({
			url: "https://media.test/quizzes/quiz-1/questions/a.png",
			placement: "background",
			crop: image.crop,
			altText: "Mapa do Brasil",
		});
	});

	it("never tells the right answer", () => {
		for (const phase of ["questionIntro", "answering", "results"] as const) {
			const stage = publicStageOf(showing(phase), aGameQuestion(), urlOf);

			expect(JSON.stringify(stage)).not.toMatch(/correct/);
		}
	});
});
