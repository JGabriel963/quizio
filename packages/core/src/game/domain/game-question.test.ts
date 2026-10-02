import { describe, expect, it } from "vitest";

import { aQuestion, aTrueFalseQuestion } from "../../quiz/testing/a-question";
import { aPlayingGame } from "../testing/a-game";
import { aGameQuestion } from "../testing/a-game-question";
import { DEFAULT_GAME_OPTIONS } from "./game-options";
import {
	arrangeGameQuestions,
	parseStoredGameQuestion,
	toGameQuestion,
} from "./game-question";
import { publicStageOf } from "./public-stage";

const choice = (text: string | null, correct = false) => ({ text, correct });

const urlOf = (key: string) => `https://media.test/${key}`;

/** A draw the tests can read: the list backwards. */
const backwards = <T>(items: readonly T[]): T[] => [...items].reverse();

function quizWith(
	choices: { text: string | null; correct: boolean }[],
	overrides: Parameters<typeof aQuestion>[0] = {},
) {
	return aQuestion({
		choices: choices.map((entry, index) => ({
			id: `choice-${index + 1}`,
			...entry,
		})),
		...overrides,
	});
}

describe("game question (spec 009)", () => {
	it("keeps only the filled answers, each at its position", () => {
		const question = toGameQuestion(
			quizWith([
				choice("Brasília", true),
				choice("Rio de Janeiro"),
				choice(null),
				choice("Salvador"),
			]),
			2,
		);

		expect(question).toMatchObject({
			index: 2,
			type: "quiz",
			text: "Qual é a capital do Brasil?",
			timeLimitSeconds: 20,
			selection: "single",
		});
		expect(question.choices).toEqual([
			{ id: "choice-1", shapeIndex: 0, text: "Brasília", correct: true },
			{ id: "choice-2", shapeIndex: 1, text: "Rio de Janeiro", correct: false },
			{ id: "choice-4", shapeIndex: 3, text: "Salvador", correct: false },
		]);
	});

	it("keeps six answers and the multiple selection", () => {
		const question = toGameQuestion(
			quizWith(
				["a", "b", "c", "d", "e", "f"].map((text) => choice(text, text < "c")),
				{ selection: "multiple", timeLimitSeconds: 5, points: "double" },
			),
			0,
		);

		expect(question.choices.map((entry) => entry.shapeIndex)).toEqual([
			0, 1, 2, 3, 4, 5,
		]);
		expect(question).toMatchObject({
			selection: "multiple",
			timeLimitSeconds: 5,
			points: "double",
		});
	});

	it("turns true/false into two answers: blue diamond, then red triangle", () => {
		const question = toGameQuestion(aTrueFalseQuestion({ correct: false }), 0);

		expect(question.selection).toBe("single");
		expect(question.choices).toEqual([
			{ id: "true", shapeIndex: 1, text: "Verdadeiro", correct: false },
			{ id: "false", shapeIndex: 0, text: "Falso", correct: true },
		]);
	});

	it("takes the image with it, detached from the quiz", () => {
		const image = {
			key: "quizzes/quiz-1/questions/a.png",
			placement: "background" as const,
			crop: { shape: "square" as const, zoom: 2, x: 0.5, y: 0.25 },
			altText: "Mapa",
		};
		const question = toGameQuestion(aQuestion({ image }), 0);

		expect(question.image).toEqual(image);
		expect(question.image?.crop).not.toBe(image.crop);
	});

	it("reads a stored question back", () => {
		const question = aGameQuestion({
			index: 4,
			image: {
				key: "a.png",
				placement: "media",
				crop: null,
				altText: null,
			},
		});

		expect(
			parseStoredGameQuestion(JSON.parse(JSON.stringify(question))),
		).toEqual(question);
		expect(parseStoredGameQuestion(null)).toBeNull();
		expect(parseStoredGameQuestion({ index: 0 })).toBeNull();
	});

	describe("in the order of the game (spec 012)", () => {
		const questions = [
			quizWith(
				[
					choice("Brasília", true),
					choice("Rio de Janeiro"),
					choice(null),
					choice("Salvador"),
				],
				{ id: "question-1" },
			),
			aTrueFalseQuestion({ id: "question-2", correct: true }),
			quizWith([choice("Azul"), choice("Verde", true)], {
				id: "question-3",
				text: "Qual é a cor da mata?",
			}),
		];

		it("keeps the editor's order with both options off", () => {
			const arranged = arrangeGameQuestions(
				questions,
				DEFAULT_GAME_OPTIONS,
				backwards,
			);

			expect(arranged).toEqual(questions.map(toGameQuestion));
		});

		it("shuffles the questions and numbers them in the drawn order", () => {
			const arranged = arrangeGameQuestions(
				questions,
				{ ...DEFAULT_GAME_OPTIONS, randomizeQuestions: true },
				backwards,
			);

			expect(arranged.map((question) => question.text)).toEqual([
				"Qual é a cor da mata?",
				"A capital do Brasil é Brasília",
				"Qual é a capital do Brasil?",
			]);
			expect(arranged.map((question) => question.index)).toEqual([0, 1, 2]);
		});

		it("shuffles the positions among the filled answers", () => {
			const [first] = arrangeGameQuestions(
				questions,
				{ ...DEFAULT_GAME_OPTIONS, randomizeAnswers: true },
				backwards,
			);

			// The same three shapes (0, 1 and 3), handed out backwards, in position order.
			expect(first?.choices).toEqual([
				{ id: "choice-4", shapeIndex: 0, text: "Salvador", correct: false },
				{
					id: "choice-2",
					shapeIndex: 1,
					text: "Rio de Janeiro",
					correct: false,
				},
				{ id: "choice-1", shapeIndex: 3, text: "Brasília", correct: true },
			]);
		});

		it("the right answer goes with its answer to the new shape", () => {
			const arranged = arrangeGameQuestions(
				questions,
				{ ...DEFAULT_GAME_OPTIONS, randomizeAnswers: true },
				backwards,
			);

			expect(arranged[2]?.choices).toEqual([
				{ id: "choice-2", shapeIndex: 0, text: "Verde", correct: true },
				{ id: "choice-1", shapeIndex: 1, text: "Azul", correct: false },
			]);
		});

		it("true or false is never shuffled", () => {
			const arranged = arrangeGameQuestions(
				questions,
				{ ...DEFAULT_GAME_OPTIONS, randomizeAnswers: true },
				backwards,
			);

			expect(arranged[1]?.choices).toEqual([
				{ id: "true", shapeIndex: 1, text: "Verdadeiro", correct: true },
				{ id: "false", shapeIndex: 0, text: "Falso", correct: false },
			]);
		});

		it("shuffling the answers leaves the questions in order", () => {
			const arranged = arrangeGameQuestions(
				questions,
				{ ...DEFAULT_GAME_OPTIONS, randomizeAnswers: true },
				backwards,
			);

			expect(arranged.map((question) => question.text)).toEqual(
				questions.map((question) => question.text),
			);
		});
	});
});

describe("public stage (spec 009)", () => {
	it("carries shapes, but no text and no correct answer", () => {
		const stage = publicStageOf(
			aPlayingGame("answering", { questionIndex: 1, questionCount: 10 }),
			aGameQuestion({ index: 1 }),
			urlOf,
		);

		expect(stage).toEqual({
			questionIndex: 1,
			questionCount: 10,
			phase: "answering",
			durationMs: 20_000,
			question: {
				type: "quiz",
				selection: "single",
				text: null,
				image: null,
				choices: [
					{ id: "choice-1", shapeIndex: 0, label: null, text: null },
					{ id: "choice-2", shapeIndex: 1, label: null, text: null },
					{ id: "choice-3", shapeIndex: 2, label: null, text: null },
					{ id: "choice-4", shapeIndex: 3, label: null, text: null },
				],
			},
		});
		expect(JSON.stringify(stage)).not.toMatch(/Brasília|capital|correct/);
	});

	it("names the true/false buttons", () => {
		const stage = publicStageOf(
			aPlayingGame("answering"),
			toGameQuestion(aTrueFalseQuestion({ correct: true }), 0),
			urlOf,
		);

		expect(stage.question?.choices).toEqual([
			{ id: "true", shapeIndex: 1, label: "Verdadeiro", text: null },
			{ id: "false", shapeIndex: 0, label: "Falso", text: null },
		]);
	});

	it("has no question during the game intro and no deadline in the results", () => {
		expect(publicStageOf(aPlayingGame("gameIntro"), null, urlOf)).toMatchObject(
			{
				phase: "gameIntro",
				durationMs: 3_000,
				question: null,
			},
		);
		expect(
			publicStageOf(aPlayingGame("results"), aGameQuestion(), urlOf),
		).toMatchObject({ phase: "results", durationMs: null });
	});
});
