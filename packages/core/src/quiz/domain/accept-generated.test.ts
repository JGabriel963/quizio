import { describe, expect, it } from "vitest";

import { asQuiz, asTrueFalse } from "../testing/a-question";
import {
	acceptGeneratedQuestions,
	type GeneratedDraft,
	InvalidGeneratedQuestionError,
	parseGeneratedQuestion,
} from "./accept-generated";
import {
	DEFAULT_GENERATION_OPTIONS,
	type GenerationOptions,
} from "./generation";
import { QuestionTextTooLongError } from "./question";

const quizDraft = (
	override: Partial<Extract<GeneratedDraft, { type: "quiz" }>> = {},
): GeneratedDraft => ({
	type: "quiz",
	text: "Qual é o maior planeta do sistema solar?",
	choices: [
		{ text: "Terra", correct: false },
		{ text: "Júpiter", correct: true },
		{ text: "Marte", correct: false },
		{ text: "Vênus", correct: false },
	],
	...override,
});

const trueFalseDraft: GeneratedDraft = {
	type: "trueFalse",
	text: "Plutão é um planeta anão",
	correct: true,
};

const options = (
	override: Partial<GenerationOptions> = {},
): GenerationOptions => ({ ...DEFAULT_GENERATION_OPTIONS, ...override });

const extract: GenerationOptions = {
	format: "extract",
	language: "auto",
	level: "intermediate",
	count: 30,
};

function ids() {
	let next = 0;
	return () => `generated-${++next}`;
}

function accept(drafts: GeneratedDraft[], chosen = options()) {
	return acceptGeneratedQuestions(drafts, chosen, ids());
}

describe("acceptGeneratedQuestions", () => {
	it("keeps a valid quiz question with four answers", () => {
		const { questions, discarded } = accept([quizDraft()]);

		expect(discarded).toBe(0);
		const question = asQuiz(questions[0]);
		expect(question.text).toBe("Qual é o maior planeta do sistema solar?");
		expect(question.selection).toBe("single");
		expect(question.choices).toEqual([
			{
				id: "choice-1",
				text: "Terra",
				textFormatting: {},
				image: null,
				correct: false,
			},
			{
				id: "choice-2",
				text: "Júpiter",
				textFormatting: {},
				image: null,
				correct: true,
			},
			{
				id: "choice-3",
				text: "Marte",
				textFormatting: {},
				image: null,
				correct: false,
			},
			{
				id: "choice-4",
				text: "Vênus",
				textFormatting: {},
				image: null,
				correct: false,
			},
		]);
	});

	it("generated answers have no formatting (spec 048)", () => {
		const { questions } = accept([quizDraft()]);

		expect(
			asQuiz(questions[0]).choices.map((choice) => choice.textFormatting),
		).toEqual([{}, {}, {}, {}]);
	});

	it("a generated question has no formatting", () => {
		const { questions } = accept([quizDraft(), trueFalseDraft], extract);

		expect(questions.map((question) => question.textFormatting)).toEqual([
			{},
			{},
		]);
	});

	it("marks every question as AI generated with 20 s and standard points", () => {
		const { questions } = accept([quizDraft()]);

		expect(questions[0]).toMatchObject({
			id: "generated-1",
			timeLimitSeconds: 20,
			points: "standard",
			image: null,
			aiGenerated: true,
		});
	});

	it("discards a question over 160 characters instead of cutting it", () => {
		const { questions, discarded } = accept([
			quizDraft({ text: "a".repeat(161) }),
			quizDraft(),
		]);

		expect(questions).toHaveLength(1);
		expect(discarded).toBe(1);
	});

	it("discards an answer over 75 characters", () => {
		const { discarded } = accept([
			quizDraft({
				choices: [
					{ text: "b".repeat(76), correct: true },
					{ text: "Marte", correct: false },
					{ text: "Terra", correct: false },
					{ text: "Vênus", correct: false },
				],
			}),
		]);

		expect(discarded).toBe(1);
	});

	it("discards a quiz question without a correct answer", () => {
		const { discarded } = accept([
			quizDraft({
				choices: [
					{ text: "A", correct: false },
					{ text: "B", correct: false },
					{ text: "C", correct: false },
					{ text: "D", correct: false },
				],
			}),
		]);

		expect(discarded).toBe(1);
	});

	it("discards a question without text or with a blank answer", () => {
		const { discarded } = accept([
			quizDraft({ text: "   " }),
			quizDraft({
				choices: [
					{ text: "A", correct: true },
					{ text: " ", correct: false },
					{ text: "C", correct: false },
					{ text: "D", correct: false },
				],
			}),
		]);

		expect(discarded).toBe(2);
	});

	it("discards a generated quiz question without exactly four answers", () => {
		const { discarded } = accept([
			quizDraft({
				choices: [
					{ text: "A", correct: true },
					{ text: "B", correct: false },
				],
			}),
		]);

		expect(discarded).toBe(1);
	});

	it("keeps extracted questions with 2 to 6 answers in 4 or 6 slots", () => {
		const two = quizDraft({
			choices: [
				{ text: "A", correct: true },
				{ text: "B", correct: false },
			],
		});
		const five = quizDraft({
			choices: ["A", "B", "C", "D", "E"].map((text, index) => ({
				text,
				correct: index === 4,
			})),
		});
		const seven = quizDraft({
			choices: ["A", "B", "C", "D", "E", "F", "G"].map((text, index) => ({
				text,
				correct: index === 0,
			})),
		});

		const { questions, discarded } = accept([two, five, seven], extract);

		expect(discarded).toBe(1);
		expect(asQuiz(questions[0]).choices.map((choice) => choice.text)).toEqual([
			"A",
			"B",
			null,
			null,
		]);
		const withFive = asQuiz(questions[1]);
		expect(withFive.choices).toHaveLength(6);
		expect(withFive.choices[4]).toEqual({
			id: "choice-5",
			text: "E",
			textFormatting: {},
			image: null,
			correct: true,
		});
		expect(withFive.choices[5]?.text).toBeNull();
	});

	it("turns more than one correct answer into multiple selection", () => {
		const { questions } = accept([
			quizDraft({
				choices: [
					{ text: "A", correct: true },
					{ text: "B", correct: true },
					{ text: "C", correct: false },
					{ text: "D", correct: false },
				],
			}),
		]);

		expect(asQuiz(questions[0]).selection).toBe("multiple");
	});

	it("keeps true/false with one answer", () => {
		const { questions } = accept(
			[trueFalseDraft],
			options({ format: "trueFalse" }),
		);

		const question = asTrueFalse(questions[0]);
		expect(question.text).toBe("Plutão é um planeta anão");
		expect(question.correct).toBe(true);
	});

	it("drops drafts of a type outside the format", () => {
		expect(accept([trueFalseDraft, quizDraft()]).questions).toHaveLength(1);
		expect(
			accept([trueFalseDraft, quizDraft()], options({ format: "trueFalse" }))
				.questions[0]?.type,
		).toBe("trueFalse");
	});

	it("keeps both types when mixed or extracting", () => {
		expect(
			accept([trueFalseDraft, quizDraft()], options({ format: "mixed" }))
				.questions,
		).toHaveLength(2);
		expect(
			accept([trueFalseDraft, quizDraft()], extract).questions,
		).toHaveLength(2);
	});

	it("cuts at the requested count", () => {
		const drafts = Array.from({ length: 7 }, () => quizDraft());

		const { questions, discarded } = accept(drafts, options({ count: 5 }));

		expect(questions).toHaveLength(5);
		expect(discarded).toBe(0);
	});

	it("never keeps more than 30 questions", () => {
		const drafts = Array.from({ length: 500 }, () => quizDraft());

		expect(accept(drafts, extract).questions).toHaveLength(30);
	});

	it("reports how many were discarded", () => {
		const { questions, discarded } = accept([
			quizDraft(),
			quizDraft({ text: "a".repeat(200) }),
			trueFalseDraft,
			quizDraft(),
		]);

		expect(questions.map((question) => question.id)).toEqual([
			"generated-1",
			"generated-2",
		]);
		expect(discarded).toBe(2);
	});
});

describe("parseGeneratedQuestion", () => {
	it("builds a question the client sends back", () => {
		const question = parseGeneratedQuestion(quizDraft(), "new-1");

		expect(question).toMatchObject({ id: "new-1", aiGenerated: true });
	});

	it("throws instead of discarding", () => {
		expect(() =>
			parseGeneratedQuestion(quizDraft({ text: "a".repeat(161) }), "new-1"),
		).toThrow(QuestionTextTooLongError);
		expect(() =>
			parseGeneratedQuestion(
				quizDraft({
					choices: [
						{ text: "A", correct: false },
						{ text: "B", correct: false },
					],
				}),
				"new-1",
			),
		).toThrow(InvalidGeneratedQuestionError);
	});

	it("accepts any type and 2 to 6 answers", () => {
		expect(parseGeneratedQuestion(trueFalseDraft, "new-1").type).toBe(
			"trueFalse",
		);
		expect(
			parseGeneratedQuestion(
				quizDraft({
					choices: [
						{ text: "A", correct: true },
						{ text: "B", correct: false },
					],
				}),
				"new-2",
			).type,
		).toBe("quiz");
	});
});
