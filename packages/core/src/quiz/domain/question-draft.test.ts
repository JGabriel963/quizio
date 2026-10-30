import { describe, expect, it } from "vitest";

import {
	AcceptedAnswerTooLongError,
	ChoiceTextTooLongError,
	InvalidSelectionModeError,
	InvalidSliderNumberError,
	InvalidTimeLimitError,
	QuestionTextTooLongError,
} from "./question";
import {
	EmptyChoiceCannotBeCorrectError,
	InvalidChoiceCountError,
	TimeLimitNotAllowedError,
	TooManyAcceptedAnswersError,
} from "./question-change";
import { questionFromDraft, TooManyPuzzleItemsError } from "./question-draft";
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
			{ id: "choice-1", text: "Paris", correct: true },
			{ id: "choice-2", text: "Lyon", correct: false },
			{ id: "choice-3", text: null, correct: false },
			{ id: "choice-4", text: null, correct: false },
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
});
