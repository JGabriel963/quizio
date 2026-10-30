import { describe, expect, it } from "vitest";
import type { AnswerImage } from "../../quiz/domain/answer-image";
import {
	aPuzzleQuestion,
	aQuestion,
	aSliderQuestion,
	aTrueFalseQuestion,
	aTypeAnswerQuestion,
} from "../../quiz/testing/a-question";
import type { TextFormatting } from "../../shared/domain/text-formatting";
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
	choices: {
		text: string | null;
		textFormatting?: TextFormatting;
		image?: AnswerImage | null;
		correct: boolean;
	}[],
	overrides: Parameters<typeof aQuestion>[0] = {},
) {
	return aQuestion({
		choices: choices.map((entry, index) => ({
			id: `choice-${index + 1}`,
			textFormatting: {},
			image: null,
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
			{
				id: "choice-1",
				shapeIndex: 0,
				text: "Brasília",
				textFormatting: {},
				image: null,
				correct: true,
			},
			{
				id: "choice-2",
				shapeIndex: 1,
				text: "Rio de Janeiro",
				textFormatting: {},
				image: null,
				correct: false,
			},
			{
				id: "choice-4",
				shapeIndex: 3,
				text: "Salvador",
				textFormatting: {},
				image: null,
				correct: false,
			},
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
			{
				id: "true",
				shapeIndex: 1,
				text: "Verdadeiro",
				textFormatting: {},
				image: null,
				correct: false,
			},
			{
				id: "false",
				shapeIndex: 0,
				text: "Falso",
				textFormatting: {},
				image: null,
				correct: true,
			},
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

	it("toGameQuestion copies the formatting (spec 047, RN-21)", () => {
		const formatting = { bold: [[12, 15]] } as const;
		const source = aQuestion({
			text: "Qual destas não é uma capital?",
			textFormatting: formatting,
		});

		const question = toGameQuestion(source, 0);

		expect(question.textFormatting).toEqual(formatting);
		expect(question.textFormatting).not.toBe(source.textFormatting);
	});

	it("parseStoredGameQuestion reads a copy without formatting", () => {
		const { textFormatting: _formatting, ...old } = aGameQuestion({
			textFormatting: { bold: [[0, 4]] },
		});

		expect(
			parseStoredGameQuestion(JSON.parse(JSON.stringify(old)))?.textFormatting,
		).toEqual({});
	});

	it("reads a stored question back", () => {
		const question = aGameQuestion({
			index: 4,
			textFormatting: { superscript: [[5, 6]] },
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

			// The same three shapes (0, 1 and 3), handed out backwards, in position
			// order, each answer named after its new place (L8).
			expect(first?.choices).toEqual([
				{
					id: "choice-1",
					shapeIndex: 0,
					text: "Salvador",
					textFormatting: {},
					image: null,
					correct: false,
				},
				{
					id: "choice-2",
					shapeIndex: 1,
					text: "Rio de Janeiro",
					textFormatting: {},
					image: null,
					correct: false,
				},
				{
					id: "choice-4",
					shapeIndex: 3,
					text: "Brasília",
					textFormatting: {},
					image: null,
					correct: true,
				},
			]);
		});

		it("an answer's id is its drawn place: an id learned in another game tells nothing (L8)", () => {
			const [first] = arrangeGameQuestions(
				questions,
				{ ...DEFAULT_GAME_OPTIONS, randomizeAnswers: true },
				backwards,
			);

			// "choice-1" was Brasília, the right one, in the editor and in every
			// game without the option; here it is a wrong answer.
			expect(
				first?.choices.find((answer) => answer.id === "choice-1"),
			).toMatchObject({ text: "Salvador", correct: false });
			for (const answer of first?.choices ?? []) {
				expect(answer.id).toBe(`choice-${answer.shapeIndex + 1}`);
			}
		});

		it("the right answer goes with its answer to the new shape", () => {
			const arranged = arrangeGameQuestions(
				questions,
				{ ...DEFAULT_GAME_OPTIONS, randomizeAnswers: true },
				backwards,
			);

			expect(arranged[2]?.choices).toEqual([
				{
					id: "choice-1",
					shapeIndex: 0,
					text: "Verde",
					textFormatting: {},
					image: null,
					correct: true,
				},
				{
					id: "choice-2",
					shapeIndex: 1,
					text: "Azul",
					textFormatting: {},
					image: null,
					correct: false,
				},
			]);
		});

		it("true or false is never shuffled", () => {
			const arranged = arrangeGameQuestions(
				questions,
				{ ...DEFAULT_GAME_OPTIONS, randomizeAnswers: true },
				backwards,
			);

			expect(arranged[1]?.choices).toEqual([
				{
					id: "true",
					shapeIndex: 1,
					text: "Verdadeiro",
					textFormatting: {},
					image: null,
					correct: true,
				},
				{
					id: "false",
					shapeIndex: 0,
					text: "Falso",
					textFormatting: {},
					image: null,
					correct: false,
				},
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
				textFormatting: {},
				image: null,
				choices: [
					{
						id: "choice-1",
						shapeIndex: 0,
						label: null,
						text: null,
						textFormatting: {},
						image: null,
					},
					{
						id: "choice-2",
						shapeIndex: 1,
						label: null,
						text: null,
						textFormatting: {},
						image: null,
					},
					{
						id: "choice-3",
						shapeIndex: 2,
						label: null,
						text: null,
						textFormatting: {},
						image: null,
					},
					{
						id: "choice-4",
						shapeIndex: 3,
						label: null,
						text: null,
						textFormatting: {},
						image: null,
					},
				],
				slider: null,
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
			{
				id: "true",
				shapeIndex: 1,
				label: "Verdadeiro",
				text: null,
				textFormatting: {},
				image: null,
			},
			{
				id: "false",
				shapeIndex: 0,
				label: "Falso",
				text: null,
				textFormatting: {},
				image: null,
			},
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

describe("type answer in a game (spec 031)", () => {
	it("a type answer is copied with its filled accepted answers and no choices", () => {
		const question = toGameQuestion(
			aTypeAnswerQuestion({
				acceptedAnswers: ["Pedro", null, "Simão Pedro"],
				timeLimitSeconds: 45,
			}),
			2,
		);

		expect(question).toMatchObject({
			index: 2,
			type: "typeAnswer",
			timeLimitSeconds: 45,
			selection: "single",
			choices: [],
			acceptedAnswers: ["Pedro", "Simão Pedro"],
		});
	});

	it("other types have no accepted answers", () => {
		expect(toGameQuestion(aQuestion(), 0).acceptedAnswers).toEqual([]);
	});

	it("a stored game question without accepted answers reads as none", () => {
		const { acceptedAnswers: _, ...stored } = aGameQuestion();

		expect(parseStoredGameQuestion(stored)?.acceptedAnswers).toEqual([]);
		expect(
			parseStoredGameQuestion(
				aGameQuestion({
					type: "typeAnswer",
					choices: [],
					acceptedAnswers: ["Pedro"],
				}),
			)?.acceptedAnswers,
		).toEqual(["Pedro"]);
	});
});

describe("slider in a game (spec 032)", () => {
	it("a slider is copied with its scale and unit, without choices", () => {
		const copied = toGameQuestion(aSliderQuestion({ answerMargin: "high" }), 2);

		expect(copied).toMatchObject({
			index: 2,
			type: "slider",
			selection: "single",
			choices: [],
			acceptedAnswers: [],
			slider: {
				min: 100,
				max: 900,
				answer: 600,
				margin: "high",
				unit: "anos",
			},
		});
		expect(toGameQuestion(aQuestion(), 0).slider).toBeNull();
	});

	it("a stored game question without a scale reads as none", () => {
		const { slider: _slider, ...stored } = aGameQuestion();

		expect(parseStoredGameQuestion(stored)?.slider).toBeNull();
		const slider = toGameQuestion(aSliderQuestion(), 0);
		expect(parseStoredGameQuestion(JSON.parse(JSON.stringify(slider)))).toEqual(
			slider,
		);
	});
});

describe("public stage of a slider (spec 032)", () => {
	const slider = toGameQuestion(aSliderQuestion(), 0);

	it("a slider stage carries the public scale from the answers on, with or without questions on devices", () => {
		const scale = {
			min: 100,
			max: 900,
			first: 104,
			last: 896,
			step: 8,
			start: 496,
			unit: "anos",
		};
		expect(
			publicStageOf(aPlayingGame("answering"), slider, urlOf).question?.slider,
		).toEqual(scale);
		expect(
			publicStageOf(
				{
					...aPlayingGame("answering"),
					options: { ...DEFAULT_GAME_OPTIONS, showQuestionsOnDevices: true },
				},
				slider,
				urlOf,
			).question?.slider,
		).toEqual(scale);
		expect(
			publicStageOf(aPlayingGame("questionIntro"), slider, urlOf).question
				?.slider,
		).toBeNull();
	});

	it("the public scale has neither the answer nor the margin", () => {
		const stage = publicStageOf(aPlayingGame("answering"), slider, urlOf);

		expect(JSON.stringify(stage)).not.toMatch(/"answer"|margin|medium|600/);
	});
});

describe("puzzle in a game (spec 033)", () => {
	it("a puzzle becomes one choice per filled slot, top to bottom, with its right order", () => {
		const copied = toGameQuestion(aPuzzleQuestion(), 1);

		expect(copied).toMatchObject({
			index: 1,
			type: "puzzle",
			selection: "single",
			timeLimitSeconds: 60,
			acceptedAnswers: [],
			slider: null,
			choices: [
				{
					id: "choice-1",
					shapeIndex: 0,
					text: "Nilo",
					textFormatting: {},
					image: null,
					correct: true,
				},
				{
					id: "choice-2",
					shapeIndex: 1,
					text: "Amazonas",
					textFormatting: {},
					image: null,
					correct: true,
				},
				{
					id: "choice-3",
					shapeIndex: 2,
					text: "Yangtzé",
					textFormatting: {},
					image: null,
					correct: true,
				},
				{
					id: "choice-4",
					shapeIndex: 3,
					text: "Mississipi",
					textFormatting: {},
					image: null,
					correct: true,
				},
			],
			correctOrder: ["choice-1", "choice-2", "choice-3", "choice-4"],
		});
		expect(toGameQuestion(aQuestion(), 0).correctOrder).toEqual([]);
	});

	it("slots 1, 2 and 4 make a three-answer puzzle", () => {
		const copied = toGameQuestion(
			aPuzzleQuestion({ items: ["Nilo", "Amazonas", null, "Yangtzé"] }),
			0,
		);

		expect(copied.choices).toEqual([
			{
				id: "choice-1",
				shapeIndex: 0,
				text: "Nilo",
				textFormatting: {},
				image: null,
				correct: true,
			},
			{
				id: "choice-2",
				shapeIndex: 1,
				text: "Amazonas",
				textFormatting: {},
				image: null,
				correct: true,
			},
			{
				id: "choice-4",
				shapeIndex: 2,
				text: "Yangtzé",
				textFormatting: {},
				image: null,
				correct: true,
			},
		]);
		expect(copied.correctOrder).toEqual(["choice-1", "choice-2", "choice-4"]);
	});

	it("a stored game question without a right order reads as none", () => {
		const { correctOrder: _order, ...stored } = aGameQuestion();

		expect(parseStoredGameQuestion(stored)?.correctOrder).toEqual([]);
		const puzzle = toGameQuestion(aPuzzleQuestion(), 0);
		expect(parseStoredGameQuestion(JSON.parse(JSON.stringify(puzzle)))).toEqual(
			puzzle,
		);
	});

	it("a puzzle is shuffled even without random answers, never in a right order", () => {
		const [puzzle] = arrangeGameQuestions(
			[aPuzzleQuestion()],
			DEFAULT_GAME_OPTIONS,
			backwards,
		);

		expect(
			puzzle?.choices.map(({ id, shapeIndex, text }) => [id, shapeIndex, text]),
		).toEqual([
			["choice-1", 0, "Mississipi"],
			["choice-2", 1, "Yangtzé"],
			["choice-3", 2, "Amazonas"],
			["choice-4", 3, "Nilo"],
		]);
		expect(puzzle?.correctOrder).toEqual([
			"choice-4",
			"choice-3",
			"choice-2",
			"choice-1",
		]);
	});

	it("a puzzle's ids follow the drawn places, so they never tell the right order", () => {
		for (const shuffle of [
			backwards,
			<T>(items: readonly T[]) => [...items.slice(1), ...items.slice(0, 1)],
		]) {
			const [puzzle] = arrangeGameQuestions(
				[aPuzzleQuestion()],
				DEFAULT_GAME_OPTIONS,
				shuffle,
			);
			const ids = puzzle?.choices.map(({ id }) => id) ?? [];

			// In the order the devices show them, the ids are just 1, 2, 3, 4.
			expect(ids).toEqual(["choice-1", "choice-2", "choice-3", "choice-4"]);
			expect([...ids].sort()).not.toEqual(puzzle?.correctOrder);
		}
	});

	it("a draw that comes out right is turned by one place", () => {
		// "1", "2", "1" backwards is the right order again.
		const [puzzle] = arrangeGameQuestions(
			[aPuzzleQuestion({ items: ["1", "2", "1", null] })],
			DEFAULT_GAME_OPTIONS,
			backwards,
		);

		expect(puzzle?.choices.map(({ text }) => text)).toEqual(["2", "1", "1"]);
	});

	it("true/false is still never shuffled", () => {
		const [trueFalse] = arrangeGameQuestions(
			[aTrueFalseQuestion({ correct: true })],
			{ ...DEFAULT_GAME_OPTIONS, randomizeAnswers: true },
			backwards,
		);

		expect(trueFalse?.choices.map(({ id }) => id)).toEqual(["true", "false"]);
	});
});

describe("answer formatting in a game (spec 048)", () => {
	const subscript2: TextFormatting = { subscript: [[1, 2]] };

	it("a quiz choice takes its answer's formatting", () => {
		const source = quizWith([
			{ text: "H2O", textFormatting: subscript2, correct: true },
			choice("CO2"),
			choice(null),
			choice(null),
		]);

		const question = toGameQuestion(source, 0);

		expect(question.choices.map((entry) => entry.textFormatting)).toEqual([
			subscript2,
			{},
		]);
		expect(question.choices[0]?.textFormatting).not.toBe(
			source.choices[0]?.textFormatting,
		);
	});

	it("a puzzle choice takes its slot's formatting", () => {
		const question = toGameQuestion(
			aPuzzleQuestion({
				items: ["H2O", null, "Sal", "Ar"],
				itemFormatting: [subscript2, {}, {}, { italic: [[0, 2]] }],
			}),
			0,
		);

		expect(
			question.choices.map(({ text, textFormatting }) => ({
				text,
				textFormatting,
			})),
		).toEqual([
			{ text: "H2O", textFormatting: subscript2 },
			{ text: "Sal", textFormatting: {} },
			{ text: "Ar", textFormatting: { italic: [[0, 2]] } },
		]);
	});

	it("true/false choices have none", () => {
		const question = toGameQuestion(aTrueFalseQuestion({ correct: true }), 0);

		expect(question.choices.map((entry) => entry.textFormatting)).toEqual([
			{},
			{},
		]);
	});

	it("parseStoredGameQuestion reads choices without formatting", () => {
		const copy = toGameQuestion(
			quizWith([
				{ text: "H2O", textFormatting: subscript2, correct: true },
				choice("CO2"),
			]),
			0,
		);
		const stored = JSON.parse(JSON.stringify(copy));

		expect(parseStoredGameQuestion(stored)?.choices[0]?.textFormatting).toEqual(
			subscript2,
		);

		const old = {
			...stored,
			choices: stored.choices.map(
				({ textFormatting: _f, ...entry }: Record<string, unknown>) => entry,
			),
		};
		expect(
			parseStoredGameQuestion(old)?.choices.map(
				(entry) => entry.textFormatting,
			),
		).toEqual([{}, {}]);

		const broken = {
			...stored,
			choices: [{ ...stored.choices[0], textFormatting: { bold: [[0, 99]] } }],
		};
		expect(parseStoredGameQuestion(broken)?.choices[0]?.textFormatting).toEqual(
			{},
		);
	});

	it("a shuffled or drawn choice keeps its formatting", () => {
		const quiz = quizWith([
			{ text: "H2O", textFormatting: subscript2, correct: true },
			choice("CO2"),
			choice("Sal"),
		]);
		const puzzle = aPuzzleQuestion({
			items: ["H2O", "Sal", "Ar", null],
			itemFormatting: [subscript2, {}, {}, {}],
		});

		const [quizCopy, puzzleCopy] = arrangeGameQuestions(
			[quiz, puzzle],
			{ ...DEFAULT_GAME_OPTIONS, randomizeAnswers: true },
			backwards,
		);

		expect(
			quizCopy?.choices.find((entry) => entry.text === "H2O")?.textFormatting,
		).toEqual(subscript2);
		expect(
			puzzleCopy?.choices.find((entry) => entry.text === "H2O")?.textFormatting,
		).toEqual(subscript2);
	});
});

describe("answer images in the game (spec 049)", () => {
	const rice: AnswerImage = {
		key: "media/ana/arroz.png",
		crop: { shape: "square", zoom: 2, x: 0.5, y: 0.5 },
		altText: "Arroz",
	};

	it("an image answer is copied with its image and no text", () => {
		const question = toGameQuestion(
			quizWith([
				{ text: null, image: rice, correct: true },
				choice("Feijão"),
				choice(null),
				choice(null),
			]),
			0,
		);

		expect(question.choices).toEqual([
			{
				id: "choice-1",
				shapeIndex: 0,
				text: null,
				textFormatting: {},
				image: rice,
				correct: true,
			},
			{
				id: "choice-2",
				shapeIndex: 1,
				text: "Feijão",
				textFormatting: {},
				image: null,
				correct: false,
			},
		]);
		expect(question.choices[0]?.image).not.toBe(rice);

		const puzzle = toGameQuestion(
			aPuzzleQuestion({
				items: [null, "Dois", "Três", null],
				itemImages: [rice, null, null, null],
			}),
			1,
		);
		expect(puzzle.choices.map(({ text, image }) => ({ text, image }))).toEqual([
			{ text: null, image: rice },
			{ text: "Dois", image: null },
			{ text: "Três", image: null },
		]);
	});

	it("reads a stored choice with an image, and an old one without", () => {
		const question = toGameQuestion(
			quizWith([{ text: null, image: rice, correct: true }, choice("Feijão")]),
			0,
		);
		const stored = JSON.parse(JSON.stringify(question));
		expect(parseStoredGameQuestion(stored)).toEqual(question);

		const old = JSON.parse(JSON.stringify(question));
		old.choices = old.choices.map(
			({ image: _, ...choice }: Record<string, unknown>) => choice,
		);
		old.choices[0].text = "Arroz";
		expect(parseStoredGameQuestion(old)?.choices[0]).toMatchObject({
			text: "Arroz",
			image: null,
		});
	});

	it("a shuffled image answer keeps its image", () => {
		const [question] = arrangeGameQuestions(
			[
				quizWith([
					{ text: null, image: rice, correct: true },
					choice("Feijão"),
					choice("Milho"),
					choice("Trigo"),
				]),
			],
			{ randomizeQuestions: false, randomizeAnswers: true },
			backwards,
		);

		const shown = question?.choices.find((choice) => choice.image !== null);
		expect(shown).toMatchObject({ shapeIndex: 3, image: rice, correct: true });
	});
});
