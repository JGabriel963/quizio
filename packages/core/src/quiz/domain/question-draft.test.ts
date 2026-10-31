import { describe, expect, it } from "vitest";
import { asPuzzle, asQuiz } from "../testing/a-question";
import {
	AcceptedAnswerTooLongError,
	ChoiceTextTooLongError,
	InvalidSelectionModeError,
	InvalidSliderNumberError,
	InvalidTimeLimitError,
	QuestionTextTooLongError,
} from "./question";
import {
	AnswerTextAndImageError,
	EmptyChoiceCannotBeCorrectError,
	InvalidChoiceCountError,
	TimeLimitNotAllowedError,
	TooManyAcceptedAnswersError,
} from "./question-change";
import { questionFromDraft, TooManyPuzzleItemsError } from "./question-draft";
import { InvalidImageCropError } from "./question-image";
import { questionIssues } from "./question-issues";

describe("questionFromDraft (spec 044, RN-21, RN-22)", () => {
	it("builds a quiz question with 2 to 6 answers in 4 or 6 slots, multiple when more than one is correct", () => {
		const single = questionFromDraft(
			{
				type: "quiz",
				text: " Capital da França? ",
				choices: [
					{ text: "Paris", correct: true },
					{ text: "Lyon", correct: false },
				],
			},
			"q1",
		);
		expect(single).toMatchObject({
			id: "q1",
			type: "quiz",
			text: "Capital da França?",
			selection: "single",
			timeLimitSeconds: 20,
			points: "standard",
		});
		expect(single.type === "quiz" && single.choices).toEqual([
			{
				id: "choice-1",
				text: "Paris",
				textFormatting: {},
				image: null,
				correct: true,
			},
			{
				id: "choice-2",
				text: "Lyon",
				textFormatting: {},
				image: null,
				correct: false,
			},
			{
				id: "choice-3",
				text: null,
				textFormatting: {},
				image: null,
				correct: false,
			},
			{
				id: "choice-4",
				text: null,
				textFormatting: {},
				image: null,
				correct: false,
			},
		]);

		const primes = ["2", "3", "4", "5", "6"].map((text) => ({
			text,
			correct: ["2", "3", "5"].includes(text),
		}));
		const multiple = questionFromDraft(
			{ type: "quiz", text: "Primos", choices: primes },
			"q2",
		);
		expect(multiple.type === "quiz" && multiple.choices).toHaveLength(6);
		expect(multiple).toMatchObject({ selection: "multiple" });
		expect(() =>
			questionFromDraft(
				{ type: "quiz", text: "Primos", selection: "single", choices: primes },
				"q3",
			),
		).toThrow(InvalidSelectionModeError);
	});

	it("refuses more than 6 answers", () => {
		expect(() =>
			questionFromDraft(
				{
					type: "quiz",
					text: "?",
					choices: Array.from({ length: 7 }, (_, index) => ({
						text: `${index}`,
						correct: index === 0,
					})),
				},
				"q",
			),
		).toThrow(InvalidChoiceCountError);
	});

	it("builds true/false, type answer, slider and puzzle questions", () => {
		expect(
			questionFromDraft(
				{ type: "trueFalse", text: "O sol é uma estrela", correct: true },
				"t",
			),
		).toMatchObject({ type: "trueFalse", correct: true });

		expect(
			questionFromDraft(
				{
					type: "typeAnswer",
					text: "Capital do Peru",
					acceptedAnswers: ["Lima", " lima "],
				},
				"a",
			),
		).toMatchObject({
			type: "typeAnswer",
			acceptedAnswers: ["Lima", "lima"],
			timeLimitSeconds: 30,
		});

		expect(
			questionFromDraft(
				{
					type: "slider",
					text: "Ano da Revolução",
					slider: {
						min: 1700,
						max: "1850",
						answer: 1789,
						unit: "ano",
						answerMargin: "low",
					},
				},
				"s",
			),
		).toMatchObject({
			type: "slider",
			min: 1700,
			max: 1850,
			answer: 1789,
			unit: "ano",
			answerMargin: "low",
		});

		expect(
			questionFromDraft(
				{ type: "slider", text: "Quantos?", slider: { answer: 600 } },
				"s2",
			),
		).toMatchObject({
			min: 580,
			max: 630,
			answer: 600,
			answerMargin: "medium",
		});

		expect(
			questionFromDraft(
				{ type: "puzzle", text: "Ordene", items: ["Um", "Dois", "Três"] },
				"p",
			),
		).toMatchObject({
			type: "puzzle",
			items: ["Um", "Dois", "Três", null],
			timeLimitSeconds: 60,
		});
	});

	it("uses the type's default time limit and refuses one the type does not offer", () => {
		expect(
			questionFromDraft({ type: "quiz", text: "?", timeLimitSeconds: 5 }, "q"),
		).toMatchObject({ timeLimitSeconds: 5 });
		expect(() =>
			questionFromDraft(
				{ type: "puzzle", text: "?", timeLimitSeconds: 10 },
				"q",
			),
		).toThrow(TimeLimitNotAllowedError);
		expect(() =>
			questionFromDraft({ type: "quiz", text: "?", timeLimitSeconds: 25 }, "q"),
		).toThrow(InvalidTimeLimitError);
	});

	it("refuses a 161-character statement, a 76-character answer, a 21-character accepted answer and a malformed slider number", () => {
		expect(() =>
			questionFromDraft({ type: "quiz", text: "a".repeat(161) }, "q"),
		).toThrow(QuestionTextTooLongError);
		expect(() =>
			questionFromDraft(
				{
					type: "quiz",
					text: "?",
					choices: [{ text: "a".repeat(76), correct: true }],
				},
				"q",
			),
		).toThrow(ChoiceTextTooLongError);
		expect(() =>
			questionFromDraft(
				{ type: "puzzle", text: "?", items: ["a".repeat(76)] },
				"q",
			),
		).toThrow(ChoiceTextTooLongError);
		expect(() =>
			questionFromDraft(
				{ type: "typeAnswer", text: "?", acceptedAnswers: ["a".repeat(21)] },
				"q",
			),
		).toThrow(AcceptedAnswerTooLongError);
		expect(() =>
			questionFromDraft(
				{
					type: "typeAnswer",
					text: "?",
					acceptedAnswers: ["a", "b", "c", "d", "e"],
				},
				"q",
			),
		).toThrow(TooManyAcceptedAnswersError);
		expect(() =>
			questionFromDraft(
				{ type: "slider", text: "?", slider: { answer: 1.234 } },
				"q",
			),
		).toThrow(InvalidSliderNumberError);
		expect(() =>
			questionFromDraft(
				{ type: "puzzle", text: "?", items: ["1", "2", "3", "4", "5"] },
				"q",
			),
		).toThrow(TooManyPuzzleItemsError);
	});

	it("keeps an incomplete question (no statement, one answer, no correct) for the editor to flag", () => {
		const question = questionFromDraft(
			{ type: "quiz", choices: [{ text: "Sozinha", correct: false }] },
			"q",
		);
		expect(question.text).toBeNull();
		expect(questionIssues(question)).not.toEqual([]);
	});

	it("refuses an empty answer marked as correct, as the editor does", () => {
		expect(() =>
			questionFromDraft(
				{
					type: "quiz",
					text: "?",
					choices: [
						{ text: "  ", correct: true },
						{ text: "B", correct: false },
					],
				},
				"q",
			),
		).toThrow(EmptyChoiceCannotBeCorrectError);
	});

	it("takes the image with its placement, crop and alt text", () => {
		expect(
			questionFromDraft(
				{
					type: "quiz",
					text: "?",
					image: {
						key: "media/owner/img.png",
						placement: "background",
						crop: { shape: "square", zoom: 1, x: 0.5, y: 0.5 },
						altText: " Mapa da França ",
					},
				},
				"q",
			).image,
		).toEqual({
			key: "media/owner/img.png",
			placement: "background",
			crop: { shape: "square", zoom: 1, x: 0.5, y: 0.5 },
			altText: "Mapa da França",
		});
	});

	it("marks every question built from a draft as made with AI", () => {
		expect(questionFromDraft({ type: "trueFalse" }, "q").aiGenerated).toBe(
			true,
		);
	});

	it("a draft keeps its formatting (spec 047, RN-29)", () => {
		const question = questionFromDraft(
			{
				type: "trueFalse",
				text: "A fórmula da água é H2O",
				textFormatting: { bold: [[13, 17]], subscript: [[21, 22]] },
			},
			"q",
		);

		expect(question.textFormatting).toEqual({
			bold: [[13, 17]],
			subscript: [[21, 22]],
		});
	});

	it("a draft without formatting has none", () => {
		expect(
			questionFromDraft({ type: "trueFalse", text: "H2O" }, "q").textFormatting,
		).toEqual({});
	});

	it("a quiz draft keeps its answers' formatting (spec 048, RN-23)", () => {
		const question = asQuiz(
			questionFromDraft(
				{
					type: "quiz",
					text: "Fórmula da água?",
					choices: [
						{
							text: " H2O ",
							textFormatting: { subscript: [[2, 3]] },
							correct: true,
						},
						{ text: "CO2", correct: false },
					],
				},
				"q",
			),
		);

		expect(question.choices.map((choice) => choice.textFormatting)).toEqual([
			{ subscript: [[1, 2]] },
			{},
			{},
			{},
		]);
	});

	it("a puzzle draft keeps its items' formatting", () => {
		const question = asPuzzle(
			questionFromDraft(
				{
					type: "puzzle",
					text: "Ordene",
					items: ["H2O", "Sal", "Ar"],
					itemFormatting: [{ subscript: [[1, 2]] }, {}, { italic: [[0, 2]] }],
				},
				"q",
			),
		);

		expect(question.itemFormatting).toEqual([
			{ subscript: [[1, 2]] },
			{},
			{ italic: [[0, 2]] },
			{},
		]);
	});

	it("a draft without answer formatting has none", () => {
		const puzzle = asPuzzle(
			questionFromDraft(
				{ type: "puzzle", text: "Ordene", items: ["a", "b", "c"] },
				"q",
			),
		);

		expect(puzzle.itemFormatting).toEqual([{}, {}, {}, {}]);
	});
});

describe("answer images in drafts (spec 049, RN-21, RN-27)", () => {
	const image = { key: "media/ana/arroz.png", altText: "Arroz" };

	it("a draft takes image answers for quiz and puzzle", () => {
		const quiz = asQuiz(
			questionFromDraft(
				{
					type: "quiz",
					text: "Prato típico?",
					choices: [
						{ text: null, image, correct: true },
						{ text: "Feijão", correct: false },
					],
				},
				"q1",
			),
		);
		expect(quiz.choices[0]).toMatchObject({
			text: null,
			image: { key: image.key, crop: null, altText: "Arroz" },
			correct: true,
		});
		expect(questionIssues(quiz)).toEqual([]);

		const puzzle = asPuzzle(
			questionFromDraft(
				{
					type: "puzzle",
					text: "Ordem?",
					items: [null, "Dois", "Três"],
					itemImages: [image],
				},
				"q2",
			),
		);
		expect(puzzle.itemImages[0]?.key).toBe(image.key);
		expect(puzzle.itemImages.slice(1)).toEqual([null, null, null]);
		expect(questionIssues(puzzle)).toEqual([]);
	});

	it("an answer with text and image is ANSWER_TEXT_AND_IMAGE", () => {
		expect(() =>
			questionFromDraft(
				{
					type: "quiz",
					choices: [{ text: "Arroz", image, correct: true }],
				},
				"q1",
			),
		).toThrow(AnswerTextAndImageError);
		expect(() =>
			questionFromDraft(
				{
					type: "quiz",
					choices: [
						{
							text: null,
							image: {
								...image,
								crop: { shape: "circle", zoom: 1, x: 0.5, y: 0.5 },
							},
							correct: true,
						},
					],
				},
				"q1",
			),
		).toThrow(InvalidImageCropError);
	});
});
