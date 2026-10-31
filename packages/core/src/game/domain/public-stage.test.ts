import { describe, expect, it } from "vitest";

import { aTrueFalseQuestion } from "../../quiz/testing/a-question";
import type { TextFormatting } from "../../shared/domain/text-formatting";
import { aPlayingGame } from "../testing/a-game";
import {
	aGameQuestion,
	aPuzzleGameQuestion,
	someChoices,
} from "../testing/a-game-question";
import { DEFAULT_GAME_OPTIONS } from "./game-options";
import type { GamePhase } from "./game-progress";
import { toGameQuestion } from "./game-question";
import { publicStageOf } from "./public-stage";
import { placedInOrder } from "./puzzle";

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

describe("public stage and the statement's formatting (spec 047)", () => {
	const formatted = aGameQuestion({
		text: "Qual é a fórmula da água, H2O?",
		textFormatting: { subscript: [[27, 28]] },
	});

	it("carries the formatting with the statement", () => {
		const stage = publicStageOf(showing("questionIntro"), formatted, urlOf);

		expect(stage.question?.text).toBe("Qual é a fórmula da água, H2O?");
		expect(stage.question?.textFormatting).toEqual({ subscript: [[27, 28]] });
	});

	it("no statement, no formatting", () => {
		const stage = publicStageOf(aPlayingGame("answering"), formatted, urlOf);

		expect(stage.question?.text).toBeNull();
		expect(stage.question?.textFormatting).toEqual({});
	});
});

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
			textFormatting: {},
			image: {
				url: "https://media.test/quizzes/quiz-1/questions/a.png",
				placement: "media",
				crop: { shape: "square", zoom: 2, x: 0.5, y: 0.25 },
				altText: "Mapa do Brasil",
			},
			choices: [
				{
					id: "choice-1",
					shapeIndex: 0,
					label: null,
					text: "Brasília",
					textFormatting: {},
					image: null,
				},
				{
					id: "choice-2",
					shapeIndex: 1,
					label: null,
					text: "Rio de Janeiro",
					textFormatting: {},
					image: null,
				},
				{
					id: "choice-3",
					shapeIndex: 2,
					label: null,
					text: "Salvador",
					textFormatting: {},
					image: null,
				},
				{
					id: "choice-4",
					shapeIndex: 3,
					label: null,
					text: "Recife",
					textFormatting: {},
					image: null,
				},
			],
			slider: null,
		});
	});

	it("true or false sends its two labels", () => {
		const stage = publicStageOf(
			showing("answering"),
			toGameQuestion(aTrueFalseQuestion({ correct: true }), 0),
			urlOf,
		);

		expect(stage.question?.choices).toEqual([
			{
				id: "true",
				shapeIndex: 1,
				label: "Verdadeiro",
				text: "Verdadeiro",
				textFormatting: {},
				image: null,
			},
			{
				id: "false",
				shapeIndex: 0,
				label: "Falso",
				text: "Falso",
				textFormatting: {},
				image: null,
			},
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

describe("public stage of a puzzle (spec 033)", () => {
	const drawn = ["choice-3", "choice-4", "choice-1", "choice-2"];
	const puzzle = (() => {
		const copied = aPuzzleGameQuestion();
		return { ...copied, choices: placedInOrder(copied, drawn) };
	})();

	it("a puzzle sends the drawn choices and never the right order", () => {
		const stage = publicStageOf(showing("answering"), puzzle, urlOf);

		expect(stage.question?.choices).toEqual([
			{
				id: "choice-3",
				shapeIndex: 0,
				label: null,
				text: "Yangtzé",
				textFormatting: {},
				image: null,
			},
			{
				id: "choice-4",
				shapeIndex: 1,
				label: null,
				text: "Mississipi",
				textFormatting: {},
				image: null,
			},
			{
				id: "choice-1",
				shapeIndex: 2,
				label: null,
				text: "Nilo",
				textFormatting: {},
				image: null,
			},
			{
				id: "choice-2",
				shapeIndex: 3,
				label: null,
				text: "Amazonas",
				textFormatting: {},
				image: null,
			},
		]);
		expect(JSON.stringify(stage)).not.toMatch(/correct/i);
	});

	it("without the questions on the devices the blocks have only shapes", () => {
		const stage = publicStageOf(aPlayingGame("answering"), puzzle, urlOf);

		expect(
			stage.question?.choices.map(({ shapeIndex, text }) => [shapeIndex, text]),
		).toEqual([
			[0, null],
			[1, null],
			[2, null],
			[3, null],
		]);
	});
});

describe("answer formatting on the devices (spec 048)", () => {
	const marks = (count: number, from: number) =>
		Array.from({ length: count }, (_, index): [number, number] => [
			from + index * 7,
			from + index * 7 + 2,
		]);
	/** Ten bold, ten italic, five subscript and five superscript stretches. */
	const heavy = (): TextFormatting => ({
		bold: marks(10, 0),
		italic: marks(10, 1),
		subscript: marks(5, 3),
		superscript: marks(5, 38),
	});
	const answerText = "a".repeat(75);
	const formattedQuestion = () =>
		aGameQuestion({
			text: "q".repeat(160),
			textFormatting: {
				bold: marks(20, 0),
				italic: marks(20, 1),
				subscript: marks(10, 3),
				superscript: marks(10, 80),
			},
			choices: someChoices(
				Array.from({ length: 6 }, () => answerText),
				[0],
			).map((entry) => ({ ...entry, textFormatting: heavy() })),
		});

	it("the choices carry the formatting only with the texts", () => {
		const question = formattedQuestion();
		const shown = publicStageOf(showing("answering"), question, urlOf);
		const hidden = publicStageOf(aPlayingGame("answering"), question, urlOf);

		expect(shown.question?.choices[0]?.textFormatting).toEqual(heavy());
		expect(hidden.question?.choices[0]?.textFormatting).toEqual({});
	});

	it("a stage with every answer and the statement formatted stays under 10 KB", () => {
		const stage = publicStageOf(
			showing("answering"),
			formattedQuestion(),
			urlOf,
		);

		// Every character here is ASCII, so the length is the size in bytes.
		expect(JSON.stringify(stage).length).toBeLessThan(10_000);
	});
});

describe("public stage with image answers (spec 049, RN-23)", () => {
	const rice = {
		key: "media/ana/arroz.png",
		crop: { shape: "square" as const, zoom: 2, x: 0.5, y: 0.5 },
		altText: "Arroz",
	};
	const question = aGameQuestion({
		choices: someChoices(["", "Feijão"]).map((choice, index) =>
			index === 0 ? { ...choice, text: null, image: rice } : choice,
		),
	});

	it("the image goes only with the texts and never in the intro", () => {
		const answering = publicStageOf(showing("answering"), question, urlOf);
		expect(answering.question?.choices[0]?.image).toEqual({
			url: urlOf(rice.key),
			crop: rice.crop,
			altText: "Arroz",
		});
		expect(answering.question?.choices[1]?.image).toBeNull();

		const intro = publicStageOf(showing("questionIntro"), question, urlOf);
		expect(intro.question?.choices.every((c) => c.image === null)).toBe(true);

		const hidden = publicStageOf(aPlayingGame("answering"), question, urlOf);
		expect(hidden.question?.choices.every((c) => c.image === null)).toBe(true);
	});
});
