import { describe, expect, it } from "vitest";

import {
	aPuzzleQuestion,
	aQuestion,
	aSliderQuestion,
	aTrueFalseQuestion,
	aTypeAnswerQuestion,
} from "../testing/a-question";
import { blankQuestion, type Question } from "./question";
import {
	newQuizVersion,
	parseVersionQuestions,
	sameQuestionLists,
} from "./quiz-version";

const now = new Date("2026-06-01T12:00:00.000Z");

const quizQuestion = aQuestion({
	id: "a",
	selection: "multiple",
	timeLimitSeconds: 45,
	points: "double",
	choices: [
		{
			id: "choice-1",
			text: "Brasília",
			textFormatting: {},
			image: null,
			correct: true,
		},
		{
			id: "choice-2",
			text: "Rio",
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
		{
			id: "choice-5",
			text: "Salvador",
			textFormatting: {},
			image: null,
			correct: true,
		},
		{
			id: "choice-6",
			text: null,
			textFormatting: {},
			image: null,
			correct: false,
		},
	],
});
const trueFalse = aTrueFalseQuestion({
	id: "b",
	correct: false,
	timeLimitSeconds: 10,
	points: "noPoints",
});
const published = [quizQuestion, trueFalse];

function withChoice(
	index: number,
	change: Partial<(typeof quizQuestion.choices)[number]>,
): Question {
	return {
		...quizQuestion,
		choices: quizQuestion.choices.map((choice, position) =>
			position === index ? { ...choice, ...change } : choice,
		),
	};
}

describe("newQuizVersion", () => {
	it("a version is a detached copy of the questions", () => {
		const version = newQuizVersion({
			quizId: "quiz-1",
			number: 1,
			questions: published,
			now,
		});

		expect(version).toEqual({
			quizId: "quiz-1",
			number: 1,
			questions: published,
			createdAt: now,
		});
		expect(version.questions).not.toBe(published);
		expect(version.questions[0]).not.toBe(quizQuestion);
		expect((version.questions[0] as typeof quizQuestion).choices[0]).not.toBe(
			quizQuestion.choices[0],
		);
	});
});

describe("sameQuestionLists", () => {
	it("equal lists have no changes", () => {
		expect(sameQuestionLists(published, [quizQuestion, trueFalse])).toBe(true);
		expect(sameQuestionLists([], [])).toBe(true);
	});

	it("ignores question ids", () => {
		expect(
			sameQuestionLists([quizQuestion], [{ ...quizQuestion, id: "copy" }]),
		).toBe(true);
	});

	it.each<[string, Question[]]>([
		["order", [trueFalse, quizQuestion]],
		["one fewer", [quizQuestion]],
		["one more", [quizQuestion, trueFalse, blankQuestion("c")]],
		["text", [{ ...quizQuestion, text: "Outra?" }, trueFalse]],
		["time", [{ ...quizQuestion, timeLimitSeconds: 20 }, trueFalse]],
		["points", [{ ...quizQuestion, points: "standard" }, trueFalse]],
		["selection", [{ ...quizQuestion, selection: "single" }, trueFalse]],
		["answer text", [withChoice(1, { text: "Recife" }), trueFalse]],
		["correct answer", [withChoice(1, { correct: true }), trueFalse]],
		[
			"answer count",
			[
				{ ...quizQuestion, choices: quizQuestion.choices.slice(0, 4) },
				trueFalse,
			],
		],
		["true/false answer", [quizQuestion, { ...trueFalse, correct: true }]],
		[
			"type",
			[
				quizQuestion,
				{
					...blankQuestion("b"),
					text: trueFalse.text,
					timeLimitSeconds: 10,
					points: "noPoints",
				},
			],
		],
	])("order, count, type and content are changes: %s", (_, changed) => {
		expect(sameQuestionLists(published, changed)).toBe(false);
		expect(sameQuestionLists(changed, published)).toBe(false);
	});
});

describe("formatting in versions (spec 047)", () => {
	const formatted = aQuestion({
		text: "Qual destas não é uma capital?",
		textFormatting: { bold: [[12, 15]] },
	});

	it("a formatting change makes the lists differ", () => {
		expect(
			sameQuestionLists(
				[formatted],
				[{ ...formatted, textFormatting: { italic: [[12, 15]] } }],
			),
		).toBe(false);
		expect(
			sameQuestionLists([formatted], [{ ...formatted, textFormatting: {} }]),
		).toBe(false);
	});

	it("the same formatting written in another order is the same", () => {
		const twoStretches = aQuestion({
			text: "Qual destas não é uma capital?",
			textFormatting: { bold: [[0, 4]], italic: [[12, 15]] },
		});

		expect(
			sameQuestionLists(
				[twoStretches],
				[
					{
						...twoStretches,
						textFormatting: { italic: [[12, 15]], bold: [[0, 4]] },
					},
				],
			),
		).toBe(true);
	});

	it("parseVersionQuestions reads the formatting and leaves it out of the content", () => {
		const stored = JSON.parse(JSON.stringify([formatted]));

		expect(parseVersionQuestions(stored)).toEqual([formatted]);
	});

	it("a stored version without the field reads without formatting", () => {
		const { textFormatting: _formatting, ...old } = formatted;
		const stored = JSON.parse(JSON.stringify([old]));

		expect(parseVersionQuestions(stored)[0]?.textFormatting).toEqual({});
	});
});

describe("answer formatting in versions (spec 048)", () => {
	const subscript2 = { subscript: [[1, 2] as [number, number]] };
	const withAnswer = aQuestion({
		choices: [
			{
				id: "choice-1",
				text: "H2O",
				textFormatting: subscript2,
				image: null,
				correct: true,
			},
			{
				id: "choice-2",
				text: "CO2",
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
		],
	});

	it("an answer's formatting change makes the lists differ", () => {
		const unformatted = {
			...withAnswer,
			choices: withAnswer.choices.map((choice) => ({
				...choice,
				textFormatting: {},
			})),
		};

		expect(sameQuestionLists([withAnswer], [unformatted])).toBe(false);
		expect(sameQuestionLists([withAnswer], [{ ...withAnswer }])).toBe(true);
	});

	it("a puzzle item's formatting change makes the lists differ", () => {
		const puzzle = aPuzzleQuestion({
			itemFormatting: [{ bold: [[0, 4]] }, {}, {}, {}],
		});

		expect(
			sameQuestionLists(
				[puzzle],
				[{ ...puzzle, itemFormatting: [{ italic: [[0, 4]] }, {}, {}, {}] }],
			),
		).toBe(false);
		expect(
			sameQuestionLists(
				[puzzle],
				[{ ...puzzle, itemFormatting: [{ bold: [[0, 4]] }, {}, {}, {}] }],
			),
		).toBe(true);
	});

	it("a stored version without answer formatting reads as none", () => {
		const stored = JSON.parse(
			JSON.stringify([
				{
					...withAnswer,
					choices: withAnswer.choices.map(
						({ textFormatting: _f, ...choice }) => choice,
					),
				},
				(({ itemFormatting: _f, ...puzzle }) => puzzle)(aPuzzleQuestion()),
			]),
		);

		const [quiz, puzzle] = parseVersionQuestions(stored);

		expect(quiz?.type === "quiz" && quiz.choices[0]?.textFormatting).toEqual(
			{},
		);
		expect(puzzle?.type === "puzzle" && puzzle.itemFormatting).toEqual([
			{},
			{},
			{},
			{},
		]);
		expect(
			parseVersionQuestions(JSON.parse(JSON.stringify([withAnswer]))),
		).toEqual([withAnswer]);
	});
});

describe("sameQuestionLists and the AI mark", () => {
	it("same lists ignore the AI mark", () => {
		const question = aQuestion();

		expect(
			sameQuestionLists([question], [{ ...question, aiGenerated: true }]),
		).toBe(true);
	});
});

describe("parseVersionQuestions", () => {
	it("keeps the AI mark", () => {
		const stored = JSON.parse(
			JSON.stringify([{ ...aQuestion(), aiGenerated: true }]),
		);

		expect(parseVersionQuestions(stored)[0]?.aiGenerated).toBe(true);
	});

	it("an old version without the mark reads as not AI generated", () => {
		const { aiGenerated: _mark, ...old } = aQuestion();
		const stored = JSON.parse(JSON.stringify([old]));

		expect(parseVersionQuestions(stored)[0]?.aiGenerated).toBe(false);
	});

	it("reads back what a version stores", () => {
		const stored = JSON.parse(JSON.stringify(published));

		expect(parseVersionQuestions(stored)).toEqual(published);
	});

	it("reads stored questions tolerantly", () => {
		expect(parseVersionQuestions(null)).toEqual([]);
		expect(parseVersionQuestions({})).toEqual([]);
		expect(
			parseVersionQuestions([
				"junk",
				{ id: "x", type: "poll" },
				{ type: "quiz" },
				{ id: "c", type: "quiz", text: 42, timeLimitSeconds: 25, points: "x" },
				{ id: "d", type: "trueFalse", text: "Certo?", correct: "yes" },
			]),
		).toEqual([
			blankQuestion("c"),
			{ ...blankQuestion("d", "trueFalse"), text: "Certo?" },
		]);
	});
});

describe("type answers in versions", () => {
	it("different accepted answers are different lists", () => {
		expect(
			sameQuestionLists(
				[aTypeAnswerQuestion({ acceptedAnswers: ["Pedro"] })],
				[aTypeAnswerQuestion({ acceptedAnswers: ["Pedro", "Jesus"] })],
			),
		).toBe(false);
		expect(
			sameQuestionLists(
				[aTypeAnswerQuestion()],
				[aQuestion({ text: aTypeAnswerQuestion().text })],
			),
		).toBe(false);
	});

	it("the same accepted answers are the same list", () => {
		expect(
			sameQuestionLists(
				[aTypeAnswerQuestion({ acceptedAnswers: ["Pedro", "Jesus"] })],
				[
					aTypeAnswerQuestion({
						id: "other",
						acceptedAnswers: ["Pedro", "Jesus"],
					}),
				],
			),
		).toBe(true);
	});

	it("a stored time outside the type falls back to its default", () => {
		const [question] = parseVersionQuestions([
			{
				id: "question-1",
				type: "typeAnswer",
				text: "Quem?",
				timeLimitSeconds: 10,
				points: "standard",
				image: null,
				acceptedAnswers: ["Pedro"],
			},
		]);

		expect(question).toMatchObject({
			type: "typeAnswer",
			timeLimitSeconds: 30,
			acceptedAnswers: ["Pedro"],
		});
	});
});

describe("sliders in versions", () => {
	it("different scales are different lists", () => {
		for (const change of [
			{ min: 0 },
			{ max: 1000 },
			{ answer: 500 },
			{ unit: null },
			{ answerMargin: "none" as const },
		]) {
			expect(
				sameQuestionLists([aSliderQuestion()], [aSliderQuestion(change)]),
			).toBe(false);
		}
	});

	it("the same scale is the same list", () => {
		expect(sameQuestionLists([aSliderQuestion()], [aSliderQuestion()])).toBe(
			true,
		);
	});
});

describe("puzzles in versions", () => {
	it("puzzles with the same slots in another order differ", () => {
		expect(
			sameQuestionLists(
				[aPuzzleQuestion()],
				[
					aPuzzleQuestion({
						items: ["Amazonas", "Nilo", "Yangtzé", "Mississipi"],
					}),
				],
			),
		).toBe(false);
		expect(sameQuestionLists([aPuzzleQuestion()], [aPuzzleQuestion()])).toBe(
			true,
		);
	});

	it("reads back a stored puzzle with its time", () => {
		const puzzle = aPuzzleQuestion({ timeLimitSeconds: 90 });
		const stored = JSON.parse(JSON.stringify([puzzle]));

		expect(parseVersionQuestions(stored)).toEqual([puzzle]);
	});
});

describe("answer images in versions (spec 049, RN-17)", () => {
	const image = { key: "media/ana/arroz.png", crop: null, altText: null };

	it("an answer image change makes the lists differ, and the version reads it back", () => {
		const withImage = aQuestion({
			id: "a",
			choices: [
				{
					id: "choice-1",
					text: null,
					textFormatting: {},
					image,
					correct: true,
				},
				{
					id: "choice-2",
					text: "B",
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
			],
		});
		const described = aQuestion({
			...withImage,
			choices: withImage.choices.map((choice) =>
				choice.image
					? { ...choice, image: { ...image, altText: "Arroz" } }
					: choice,
			),
		});
		const puzzle = aPuzzleQuestion({
			id: "p",
			itemImages: [image, null, null, null],
			items: [null, "B", "C", null],
		});
		const movedPuzzle = aPuzzleQuestion({
			id: "p",
			itemImages: [null, image, null, null],
			items: ["B", null, "C", null],
		});

		expect(sameQuestionLists([withImage], [described])).toBe(false);
		expect(sameQuestionLists([puzzle], [movedPuzzle])).toBe(false);
		expect(sameQuestionLists([withImage, puzzle], [withImage, puzzle])).toBe(
			true,
		);

		const version = newQuizVersion({
			quizId: "quiz-1",
			number: 1,
			questions: [withImage, puzzle],
			now,
		});
		expect(
			parseVersionQuestions(JSON.parse(JSON.stringify(version.questions))),
		).toEqual([withImage, puzzle]);
	});
});
