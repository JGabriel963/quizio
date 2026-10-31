import { describe, expect, it } from "vitest";

import {
	aPuzzleQuestion,
	aQuestion,
	aSliderQuestion,
	asPuzzle,
	asQuiz,
	asSlider,
	asTrueFalse,
	asTypeAnswer,
	aTrueFalseQuestion,
	aTypeAnswerQuestion,
} from "../testing/a-question";
import {
	AcceptedAnswerTooLongError,
	ChoiceTextTooLongError,
	InvalidQuestionPointsError,
	InvalidQuestionTypeError,
	InvalidSelectionModeError,
	InvalidSliderNumberError,
	InvalidTimeLimitError,
	PUZZLE_ITEM_COUNT,
	type Question,
	QuestionTextTooLongError,
	type QuizQuestion,
	questionContent,
	SliderUnitTooLongError,
} from "./question";
import {
	AcceptedAnswerNotFoundError,
	AnswerHasImageError,
	AnswerHasNoImageError,
	AnswerTextAndImageError,
	applyQuestionChange,
	ChoiceNotFoundError,
	EmptyChoiceCannotBeCorrectError,
	InvalidAnswerMarginError,
	PuzzleItemNotFoundError,
	type QuestionChange,
	QuestionChangeNotApplicableError,
	SliderAnswerRequiredError,
	TimeLimitNotAllowedError,
	TooManyAcceptedAnswersError,
} from "./question-change";
import {
	ImageAltTextTooLongError,
	InvalidImageCropError,
} from "./question-image";

function withChoices(
	texts: (string | null)[],
	correct: number[] = [],
	overrides: Partial<QuizQuestion> = {},
): QuizQuestion {
	return aQuestion({
		choices: texts.map((text, index) => ({
			id: `choice-${index + 1}`,
			text,
			textFormatting: {},
			image: null,
			correct: correct.includes(index),
		})),
		...overrides,
	});
}

/** A change that keeps the question a quiz one. */
function applyToQuiz(question: QuizQuestion, change: QuestionChange) {
	const result = applyQuestionChange(question, change);
	return { question: asQuiz(result.question), notice: result.notice };
}

describe("applyQuestionChange on a true/false question", () => {
	it("marks the correct true/false answer", () => {
		const { question, notice } = applyQuestionChange(aTrueFalseQuestion(), {
			kind: "trueFalseCorrect",
			correct: false,
		});

		expect(asTrueFalse(question).correct).toBe(false);
		expect(notice).toBeNull();
	});

	it("changes text, time and points of a true/false question", () => {
		let question = applyQuestionChange(aTrueFalseQuestion({ correct: true }), {
			kind: "timeLimit",
			seconds: 10,
		}).question;
		question = applyQuestionChange(question, {
			kind: "points",
			points: "double",
		}).question;
		question = applyQuestionChange(question, {
			kind: "text",
			text: " O céu é azul ",
		}).question;

		expect(question).toEqual(
			aTrueFalseQuestion({
				text: "O céu é azul",
				timeLimitSeconds: 10,
				points: "double",
				correct: true,
			}),
		);
	});

	it("refuses a quiz change on a true/false question and vice versa", () => {
		const quizChanges: QuestionChange[] = [
			{ kind: "selection", selection: "multiple" },
			{ kind: "choiceText", choiceId: "choice-1", text: "Sim" },
			{ kind: "choiceCorrect", choiceId: "choice-1", correct: true },
			{ kind: "extraChoices", visible: true },
		];
		for (const change of quizChanges) {
			expect(() => applyQuestionChange(aTrueFalseQuestion(), change)).toThrow(
				QuestionChangeNotApplicableError,
			);
		}
		expect(() =>
			applyQuestionChange(aQuestion(), {
				kind: "trueFalseCorrect",
				correct: true,
			}),
		).toThrow(QuestionChangeNotApplicableError);
	});
});

describe("applyQuestionChange changing the type", () => {
	const written = withChoices(["Sim", "Não", null, null], [0], {
		id: "q-7",
		text: "A capital do Brasil é Brasília",
		timeLimitSeconds: 30,
		points: "double",
	});

	it("a type change keeps the AI mark", () => {
		const { question } = applyQuestionChange(
			{ ...written, aiGenerated: true },
			{ kind: "type", type: "trueFalse", remembered: null },
		);

		expect(question.aiGenerated).toBe(true);
	});

	it("keeps text, time and points and blanks the answers", () => {
		const { question } = applyQuestionChange(written, {
			kind: "type",
			type: "trueFalse",
			remembered: null,
		});

		expect(question).toEqual({
			id: "q-7",
			type: "trueFalse",
			text: "A capital do Brasil é Brasília",
			textFormatting: {},
			timeLimitSeconds: 30,
			points: "double",
			image: null,
			aiGenerated: false,
			correct: null,
		});
	});

	it("a type change keeps the formatting", () => {
		const { question } = applyQuestionChange(
			{ ...written, textFormatting: { bold: [[2, 9]] } },
			{ kind: "type", type: "trueFalse", remembered: null },
		);

		expect(question.textFormatting).toEqual({ bold: [[2, 9]] });
	});

	it("tells when quiz answers were set aside", () => {
		const { notice } = applyQuestionChange(written, {
			kind: "type",
			type: "trueFalse",
			remembered: null,
		});

		expect(notice).toEqual({ kind: "quizAnswersKept" });
	});

	it("gives no notice without written answers or from true/false to quiz", () => {
		expect(
			applyQuestionChange(aQuestion(), {
				kind: "type",
				type: "trueFalse",
				remembered: null,
			}).notice,
		).toBeNull();
		expect(
			applyQuestionChange(aTrueFalseQuestion({ correct: true }), {
				kind: "type",
				type: "quiz",
				remembered: null,
			}).notice,
		).toBeNull();
	});

	it("a true/false question becomes a quiz one with four empty single-choice answers", () => {
		const { question } = applyQuestionChange(
			aTrueFalseQuestion({ id: "q-7", correct: true, timeLimitSeconds: 30 }),
			{ kind: "type", type: "quiz", remembered: null },
		);

		expect(question).toEqual(
			aQuestion({
				id: "q-7",
				text: "A capital do Brasil é Brasília",
				timeLimitSeconds: 30,
			}),
		);
	});

	it("restores remembered quiz content: six slots, corrects and multiple selection", () => {
		const before = withChoices(["A", "B", null, null, "E", null], [0, 4], {
			selection: "multiple",
		});
		const remembered = questionContent(before);

		const { question, notice } = applyQuestionChange(
			aTrueFalseQuestion({ text: before.text }),
			{ kind: "type", type: "quiz", remembered },
		);

		expect(question).toEqual(before);
		expect(notice).toBeNull();
	});

	it("restores the remembered true/false answer", () => {
		const { question } = applyQuestionChange(aQuestion(), {
			kind: "type",
			type: "trueFalse",
			remembered: { type: "trueFalse", correct: false },
		});

		expect(asTrueFalse(question).correct).toBe(false);
	});

	it("validates the remembered content like any edit", () => {
		expect(() =>
			applyQuestionChange(aTrueFalseQuestion(), {
				kind: "type",
				type: "quiz",
				remembered: {
					type: "quiz",
					selection: "single",
					choices: [
						{ text: "a".repeat(76), correct: false },
						{ text: null, correct: false },
						{ text: null, correct: false },
						{ text: null, correct: false },
					],
				},
			}),
		).toThrow(ChoiceTextTooLongError);
	});

	it("the same type changes nothing", () => {
		const { question, notice } = applyQuestionChange(written, {
			kind: "type",
			type: "quiz",
			remembered: null,
		});

		expect(question).toBe(written);
		expect(notice).toBeNull();
	});

	it("refuses an unknown type and a remembered content of another type", () => {
		expect(() =>
			applyQuestionChange(written, {
				kind: "type",
				type: "poll",
				remembered: null,
			}),
		).toThrow(InvalidQuestionTypeError);
		expect(() =>
			applyQuestionChange(written, {
				kind: "type",
				type: "trueFalse",
				remembered: questionContent(written),
			}),
		).toThrow(InvalidQuestionTypeError);
	});
});

describe("applyQuestionChange", () => {
	describe("text", () => {
		it("parses the question text", () => {
			const { question, notice } = applyToQuiz(aQuestion(), {
				kind: "text",
				text: "  Capital?  ",
			});

			expect(question.text).toBe("Capital?");
			expect(notice).toBeNull();
		});

		it("a text change saves the text and its formatting", () => {
			const { question } = applyToQuiz(aQuestion(), {
				kind: "text",
				text: " Quanto é 22? ",
				formatting: { superscript: [[11, 12]] },
			});

			expect(question.text).toBe("Quanto é 22?");
			expect(question.textFormatting).toEqual({ superscript: [[10, 11]] });
		});

		it("a text change without marks clears the formatting", () => {
			const { question } = applyToQuiz(
				aQuestion({ text: "H2O", textFormatting: { subscript: [[1, 2]] } }),
				{ kind: "text", text: "H2O" },
			);

			expect(question.textFormatting).toEqual({});
		});

		it("refuses more than 160 characters", () => {
			expect(() =>
				applyToQuiz(aQuestion(), {
					kind: "text",
					text: "a".repeat(161),
				}),
			).toThrow(QuestionTextTooLongError);
		});
	});

	describe("choice text", () => {
		it("trims the answer and keeps the other fields", () => {
			const source = withChoices(["Rio", null, null, null], [0]);

			const { question } = applyToQuiz(source, {
				kind: "choiceText",
				choiceId: "choice-2",
				text: "  Brasília ",
			});

			expect(question.choices[1]).toEqual({
				id: "choice-2",
				text: "Brasília",
				textFormatting: {},
				image: null,
				correct: false,
			});
			expect(question.choices[0]).toEqual(source.choices[0]);
		});

		it("accepts 75 characters and refuses 76", () => {
			const source = aQuestion();
			expect(
				applyToQuiz(source, {
					kind: "choiceText",
					choiceId: "choice-1",
					text: "a".repeat(75),
				}).question.choices[0]?.text,
			).toHaveLength(75);
			expect(() =>
				applyToQuiz(source, {
					kind: "choiceText",
					choiceId: "choice-1",
					text: "a".repeat(76),
				}),
			).toThrow(ChoiceTextTooLongError);
		});

		it("clearing a correct answer also unmarks it", () => {
			const source = withChoices(["Brasília", "Rio", null, null], [0]);

			const { question } = applyToQuiz(source, {
				kind: "choiceText",
				choiceId: "choice-1",
				text: "   ",
			});

			expect(question.choices[0]).toEqual({
				id: "choice-1",
				text: null,
				textFormatting: {},
				image: null,
				correct: false,
			});
		});

		it("does not mutate the source question", () => {
			const source = withChoices([null, null, null, null]);

			applyToQuiz(source, {
				kind: "choiceText",
				choiceId: "choice-1",
				text: "Rio",
			});

			expect(source.choices[0]?.text).toBeNull();
		});
	});

	describe("correct", () => {
		it("marks an answer with text as correct", () => {
			const { question, notice } = applyToQuiz(
				withChoices(["Brasília", "Rio", null, null]),
				{ kind: "choiceCorrect", choiceId: "choice-1", correct: true },
			);

			expect(question.choices[0]?.correct).toBe(true);
			expect(notice).toBeNull();
		});

		it("refuses to mark an empty answer as correct", () => {
			expect(() =>
				applyToQuiz(withChoices(["Brasília", null, null, null]), {
					kind: "choiceCorrect",
					choiceId: "choice-2",
					correct: true,
				}),
			).toThrow(EmptyChoiceCannotBeCorrectError);
		});

		it("a second correct in single selection switches to multiple with a notice", () => {
			const { question, notice } = applyToQuiz(
				withChoices(["Brasília", "Rio", null, null], [0]),
				{ kind: "choiceCorrect", choiceId: "choice-2", correct: true },
			);

			expect(question.selection).toBe("multiple");
			expect(question.choices.map((choice) => choice.correct)).toEqual([
				true,
				true,
				false,
				false,
			]);
			expect(notice).toEqual({ kind: "multipleEnabled" });
		});

		it("a second correct in multiple selection has no notice", () => {
			const { notice } = applyToQuiz(
				withChoices(["Brasília", "Rio", null, null], [0], {
					selection: "multiple",
				}),
				{ kind: "choiceCorrect", choiceId: "choice-2", correct: true },
			);

			expect(notice).toBeNull();
		});

		it("unmarks an answer", () => {
			const { question } = applyToQuiz(
				withChoices(["Brasília", "Rio", null, null], [0]),
				{ kind: "choiceCorrect", choiceId: "choice-1", correct: false },
			);

			expect(question.choices[0]?.correct).toBe(false);
		});
	});

	describe("selection", () => {
		it("switching to single keeps the first correct and reports how many were cleared", () => {
			const { question, notice } = applyToQuiz(
				withChoices(["A", "B", "C", null], [1, 0, 2], {
					selection: "multiple",
				}),
				{ kind: "selection", selection: "single" },
			);

			expect(question.selection).toBe("single");
			expect(question.choices.map((choice) => choice.correct)).toEqual([
				true,
				false,
				false,
				false,
			]);
			expect(notice).toEqual({ kind: "correctsCleared", count: 2 });
		});

		it("switching to single with at most one correct has no notice", () => {
			const { question, notice } = applyToQuiz(
				withChoices(["A", "B", null, null], [1], { selection: "multiple" }),
				{ kind: "selection", selection: "single" },
			);

			expect(question.choices[1]?.correct).toBe(true);
			expect(notice).toBeNull();
		});

		it("switches to multiple", () => {
			const { question, notice } = applyToQuiz(aQuestion(), {
				kind: "selection",
				selection: "multiple",
			});

			expect(question.selection).toBe("multiple");
			expect(notice).toBeNull();
		});

		it("refuses an unknown mode", () => {
			expect(() =>
				applyToQuiz(aQuestion(), {
					kind: "selection",
					selection: "all",
				}),
			).toThrow(InvalidSelectionModeError);
		});
	});

	describe("extra choices", () => {
		it("showing them adds slots 5 and 6", () => {
			const { question } = applyToQuiz(aQuestion(), {
				kind: "extraChoices",
				visible: true,
			});

			expect(question.choices.map((choice) => choice.id)).toEqual([
				"choice-1",
				"choice-2",
				"choice-3",
				"choice-4",
				"choice-5",
				"choice-6",
			]);
			expect(question.choices[5]).toEqual({
				id: "choice-6",
				text: null,
				textFormatting: {},
				image: null,
				correct: false,
			});
		});

		it("showing them twice changes nothing", () => {
			const source = withChoices(["A", "B", "C", "D", "E", null], [4], {
				selection: "multiple",
			});

			const { question } = applyToQuiz(source, {
				kind: "extraChoices",
				visible: true,
			});

			expect(question).toEqual(source);
		});

		it("hiding them discards slots 5 and 6", () => {
			const source = withChoices(
				["A", "B", "C", "D", "Salvador", "F"],
				[0, 4],
				{ selection: "multiple" },
			);

			const { question } = applyToQuiz(source, {
				kind: "extraChoices",
				visible: false,
			});

			expect(question.choices.map((choice) => choice.text)).toEqual([
				"A",
				"B",
				"C",
				"D",
			]);
			expect(question.choices[0]?.correct).toBe(true);
		});
	});

	describe("time and points", () => {
		it("sets an allowed time limit", () => {
			expect(
				applyToQuiz(aQuestion(), { kind: "timeLimit", seconds: 90 }).question
					.timeLimitSeconds,
			).toBe(90);
		});

		it("refuses a time outside the list", () => {
			expect(() =>
				applyToQuiz(aQuestion(), { kind: "timeLimit", seconds: 25 }),
			).toThrow(InvalidTimeLimitError);
		});

		it("sets the points", () => {
			expect(
				applyToQuiz(aQuestion(), { kind: "points", points: "double" }).question
					.points,
			).toBe("double");
		});

		it("refuses unknown points", () => {
			expect(() =>
				applyToQuiz(aQuestion(), { kind: "points", points: "triple" }),
			).toThrow(InvalidQuestionPointsError);
		});
	});

	describe("unknown choice", () => {
		it("refuses a choice the question does not have", () => {
			expect(() =>
				applyToQuiz(aQuestion(), {
					kind: "choiceText",
					choiceId: "choice-5",
					text: "Salvador",
				}),
			).toThrow(ChoiceNotFoundError);
			expect(() =>
				applyToQuiz(aQuestion(), {
					kind: "choiceCorrect",
					choiceId: "nope",
					correct: true,
				}),
			).toThrow(ChoiceNotFoundError);
		});
	});
});

describe("applyQuestionChange on a type answer question", () => {
	const apply = (question: Question, change: QuestionChange) =>
		applyQuestionChange(question, change).question;

	it("writes an accepted answer at its position", () => {
		const question = aTypeAnswerQuestion({ acceptedAnswers: ["Pedro", null] });

		const changed = apply(question, {
			kind: "acceptedAnswerText",
			index: 1,
			text: "  Jesus ",
		});

		expect(asTypeAnswer(changed).acceptedAnswers).toEqual(["Pedro", "Jesus"]);
	});

	it("refuses an accepted answer over 20 characters", () => {
		expect(() =>
			apply(aTypeAnswerQuestion(), {
				kind: "acceptedAnswerText",
				index: 0,
				text: "a".repeat(21),
			}),
		).toThrow(AcceptedAnswerTooLongError);
	});

	it("refuses a position the question does not have", () => {
		expect(() =>
			apply(aTypeAnswerQuestion(), {
				kind: "acceptedAnswerText",
				index: 1,
				text: "Jesus",
			}),
		).toThrow(AcceptedAnswerNotFoundError);
	});

	it("adds accepted answers up to four", () => {
		let question: Question = aTypeAnswerQuestion();
		for (let i = 0; i < 3; i++) {
			question = apply(question, { kind: "acceptedAnswerAdded" });
		}

		expect(asTypeAnswer(question).acceptedAnswers).toEqual([
			"Pedro",
			null,
			null,
			null,
		]);
	});

	it("refuses a fifth accepted answer", () => {
		const question = aTypeAnswerQuestion({
			acceptedAnswers: ["a", "b", "c", "d"],
		});

		expect(() => apply(question, { kind: "acceptedAnswerAdded" })).toThrow(
			TooManyAcceptedAnswersError,
		);
	});

	it("removes an extra accepted answer", () => {
		const question = aTypeAnswerQuestion({
			acceptedAnswers: ["Pedro", "Jesus", null],
		});

		const changed = apply(question, {
			kind: "acceptedAnswerRemoved",
			index: 1,
		});

		expect(asTypeAnswer(changed).acceptedAnswers).toEqual(["Pedro", null]);
	});

	it("never removes the main accepted answer", () => {
		expect(() =>
			apply(aTypeAnswerQuestion(), { kind: "acceptedAnswerRemoved", index: 0 }),
		).toThrow(AcceptedAnswerNotFoundError);
	});

	it("refuses a time limit the type does not take", () => {
		expect(() =>
			apply(aTypeAnswerQuestion(), { kind: "timeLimit", seconds: 10 }),
		).toThrow(TimeLimitNotAllowedError);
		expect(
			apply(aTypeAnswerQuestion(), { kind: "timeLimit", seconds: 20 })
				.timeLimitSeconds,
		).toBe(20);
	});

	it("changing to type answer raises the time to 20 s and starts blank", () => {
		const quiz = aQuestion({ timeLimitSeconds: 10, points: "double" });

		const changed = apply(quiz, {
			kind: "type",
			type: "typeAnswer",
			remembered: null,
		});

		expect(changed).toMatchObject({
			type: "typeAnswer",
			text: quiz.text,
			timeLimitSeconds: 20,
			points: "double",
			acceptedAnswers: [null],
		});
	});

	it("changing back restores the remembered accepted answers", () => {
		const changed = apply(aQuestion(), {
			kind: "type",
			type: "typeAnswer",
			remembered: { type: "typeAnswer", acceptedAnswers: ["Pedro", " Jesus "] },
		});

		expect(asTypeAnswer(changed).acceptedAnswers).toEqual(["Pedro", "Jesus"]);
	});

	it("validates remembered accepted answers like any edit", () => {
		expect(() =>
			apply(aQuestion(), {
				kind: "type",
				type: "typeAnswer",
				remembered: {
					type: "typeAnswer",
					acceptedAnswers: ["a", "b", "c", "d", "e"],
				},
			}),
		).toThrow(TooManyAcceptedAnswersError);
	});

	it("accepted-answer changes do not apply to other types", () => {
		expect(() => apply(aQuestion(), { kind: "acceptedAnswerAdded" })).toThrow(
			QuestionChangeNotApplicableError,
		);
		expect(() =>
			apply(aTypeAnswerQuestion(), {
				kind: "selection",
				selection: "multiple",
			}),
		).toThrow(QuestionChangeNotApplicableError);
	});
});

describe("applyQuestionChange on a slider", () => {
	const apply = (question: Question, change: QuestionChange) =>
		asSlider(applyQuestionChange(question, change).question);

	it("writes the min, the max and the answer from typed text", () => {
		let question = apply(aSliderQuestion(), {
			kind: "sliderNumber",
			field: "min",
			value: "-100,3",
		});
		question = apply(question, {
			kind: "sliderNumber",
			field: "max",
			value: "2000.03",
		});
		question = apply(question, {
			kind: "sliderNumber",
			field: "answer",
			value: "600",
		});

		expect(question).toMatchObject({ min: -100.3, max: 2000.03, answer: 600 });
		expect(() =>
			apply(question, { kind: "sliderNumber", field: "max", value: "1,234" }),
		).toThrow(InvalidSliderNumberError);
	});

	it("changing the range never moves the answer", () => {
		const changed = apply(aSliderQuestion(), {
			kind: "sliderNumber",
			field: "max",
			value: "200",
		});

		expect(changed).toMatchObject({ min: 100, max: 200, answer: 600 });
	});

	it("empties the min or the max, never the answer", () => {
		expect(
			apply(aSliderQuestion(), {
				kind: "sliderNumber",
				field: "min",
				value: null,
			}).min,
		).toBeNull();
		expect(() =>
			apply(aSliderQuestion(), {
				kind: "sliderNumber",
				field: "answer",
				value: null,
			}),
		).toThrow(SliderAnswerRequiredError);
	});

	it("the first answer sets the range around it", () => {
		const first = (value: string) =>
			apply(aSliderQuestion({ min: 0, max: 50, answer: null }), {
				kind: "sliderNumber",
				field: "answer",
				value,
			});

		expect(first("600")).toMatchObject({ min: 580, max: 630, answer: 600 });
		expect(first("430")).toMatchObject({ min: 420, max: 470, answer: 430 });
		expect(first("10")).toMatchObject({ min: 0, max: 50, answer: 10 });
		expect(first("3,14")).toMatchObject({ min: 0, max: 50 });
		expect(first("-5")).toMatchObject({ min: -20, max: 30 });
		// Strictly below, also with decimals: never a whole interval more.
		expect(first("20,5")).toMatchObject({ min: 20, max: 70 });
		expect(first("20")).toMatchObject({ min: 0, max: 50 });
		expect(first("-19,5")).toMatchObject({ min: -20, max: 30 });
		expect(first("0,01")).toMatchObject({ min: 0, max: 50 });
	});

	it("a later answer keeps the range", () => {
		const changed = apply(aSliderQuestion({ min: 0, max: 50, answer: 10 }), {
			kind: "sliderNumber",
			field: "answer",
			value: "600",
		});

		expect(changed).toMatchObject({ min: 0, max: 50, answer: 600 });
	});

	it("writes and clears the unit", () => {
		expect(
			apply(aSliderQuestion({ unit: null }), {
				kind: "sliderUnit",
				text: " m ",
			}).unit,
		).toBe("m");
		expect(
			apply(aSliderQuestion(), { kind: "sliderUnit", text: "" }).unit,
		).toBeNull();
		expect(() =>
			apply(aSliderQuestion(), { kind: "sliderUnit", text: "a".repeat(21) }),
		).toThrow(SliderUnitTooLongError);
	});

	it("writes the answer margin", () => {
		expect(
			apply(aSliderQuestion(), { kind: "answerMargin", margin: "maximum" })
				.answerMargin,
		).toBe("maximum");
		expect(() =>
			apply(aSliderQuestion(), { kind: "answerMargin", margin: "huge" }),
		).toThrow(InvalidAnswerMarginError);
	});

	it("changing to slider starts blank with 10 s from 5 s", () => {
		const changed = apply(aQuestion({ timeLimitSeconds: 5 }), {
			kind: "type",
			type: "slider",
			remembered: null,
		});

		expect(changed).toMatchObject({
			timeLimitSeconds: 10,
			min: 0,
			max: 50,
			answer: null,
			unit: null,
			answerMargin: "medium",
		});
	});

	it("changing back restores the remembered scale", () => {
		const slider = aSliderQuestion({ answerMargin: "high" });
		const quiz = applyQuestionChange(slider, {
			kind: "type",
			type: "quiz",
			remembered: null,
		}).question;

		const back = apply(quiz, {
			kind: "type",
			type: "slider",
			remembered: questionContent(slider),
		});

		expect(back).toMatchObject({
			min: 100,
			max: 900,
			answer: 600,
			unit: "anos",
			answerMargin: "high",
		});
	});

	it("validates a remembered scale like any edit", () => {
		expect(() =>
			apply(aQuestion(), {
				kind: "type",
				type: "slider",
				remembered: {
					type: "slider",
					min: 0,
					max: 50,
					answer: 1.234,
					unit: null,
					answerMargin: "medium",
				},
			}),
		).toThrow(InvalidSliderNumberError);
	});

	it("slider changes do not apply to other types", () => {
		expect(() =>
			applyQuestionChange(aQuestion(), {
				kind: "sliderNumber",
				field: "answer",
				value: "1",
			}),
		).toThrow(QuestionChangeNotApplicableError);
		expect(() =>
			applyQuestionChange(aSliderQuestion(), {
				kind: "acceptedAnswerAdded",
			}),
		).toThrow(QuestionChangeNotApplicableError);
	});
});

describe("applyQuestionChange on a puzzle", () => {
	const rivers = () =>
		aPuzzleQuestion({ items: ["Nilo", "Amazonas", "Yangtzé", "Mississipi"] });

	it("puzzleItemText writes a slot and empties it with null", () => {
		const { question } = applyQuestionChange(
			aPuzzleQuestion({ items: [null, null, null, null] }),
			{ kind: "puzzleItemText", index: 1, text: "  Amazonas " },
		);
		expect(asPuzzle(question).items).toEqual([null, "Amazonas", null, null]);

		const emptied = applyQuestionChange(question, {
			kind: "puzzleItemText",
			index: 1,
			text: "   ",
		});
		expect(asPuzzle(emptied.question).items).toEqual([null, null, null, null]);
	});

	it("puzzleItemText refuses a 76th character", () => {
		expect(() =>
			applyQuestionChange(rivers(), {
				kind: "puzzleItemText",
				index: 0,
				text: "a".repeat(76),
			}),
		).toThrow(ChoiceTextTooLongError);
		expect(
			asPuzzle(
				applyQuestionChange(rivers(), {
					kind: "puzzleItemText",
					index: 0,
					text: "a".repeat(75),
				}).question,
			).items[0],
		).toHaveLength(75);
	});

	it("puzzleItemMoved takes a slot to another place and shifts the ones between", () => {
		const up = applyQuestionChange(rivers(), {
			kind: "puzzleItemMoved",
			from: 2,
			to: 0,
		});
		expect(asPuzzle(up.question).items).toEqual([
			"Yangtzé",
			"Nilo",
			"Amazonas",
			"Mississipi",
		]);

		const down = applyQuestionChange(rivers(), {
			kind: "puzzleItemMoved",
			from: 0,
			to: 3,
		});
		expect(asPuzzle(down.question).items).toEqual([
			"Amazonas",
			"Yangtzé",
			"Mississipi",
			"Nilo",
		]);
	});

	it("moving an empty slot moves the emptiness", () => {
		const { question } = applyQuestionChange(
			aPuzzleQuestion({ items: ["Nilo", null, "Yangtzé", null] }),
			{ kind: "puzzleItemMoved", from: 1, to: 3 },
		);
		expect(asPuzzle(question).items).toEqual(["Nilo", "Yangtzé", null, null]);
	});

	it("moving a slot to its own place changes nothing", () => {
		const before = rivers();
		const { question } = applyQuestionChange(before, {
			kind: "puzzleItemMoved",
			from: 2,
			to: 2,
		});
		expect(question).toEqual(before);
	});

	it("a slot outside 0 to 3 is not found", () => {
		for (const change of [
			{ kind: "puzzleItemText", index: PUZZLE_ITEM_COUNT, text: "x" },
			{ kind: "puzzleItemText", index: -1, text: "x" },
			{ kind: "puzzleItemText", index: 1.5, text: "x" },
			{ kind: "puzzleItemMoved", from: 0, to: 4 },
			{ kind: "puzzleItemMoved", from: 4, to: 0 },
		] satisfies QuestionChange[]) {
			expect(() => applyQuestionChange(rivers(), change)).toThrow(
				PuzzleItemNotFoundError,
			);
		}
	});

	it("puzzle changes do not apply to other types", () => {
		expect(() =>
			applyQuestionChange(aQuestion(), {
				kind: "puzzleItemMoved",
				from: 0,
				to: 1,
			}),
		).toThrow(QuestionChangeNotApplicableError);
	});

	it("changing a 10 s quiz to puzzle gives empty slots and 20 s, and back brings the choices", () => {
		const quiz = withChoices(["A", "B", "C", "D"], [0], {
			timeLimitSeconds: 10,
		});
		const { question: puzzle } = applyQuestionChange(quiz, {
			kind: "type",
			type: "puzzle",
			remembered: null,
		});
		expect(asPuzzle(puzzle).items).toEqual([null, null, null, null]);
		expect(puzzle.timeLimitSeconds).toBe(20);
		expect(puzzle.text).toBe(quiz.text);

		const written = applyQuestionChange(puzzle, {
			kind: "puzzleItemText",
			index: 0,
			text: "Nilo",
		}).question;
		const remembered = questionContent(written);
		const { question: back } = applyQuestionChange(written, {
			kind: "type",
			type: "quiz",
			remembered: questionContent(quiz),
		});
		expect(asQuiz(back).choices).toEqual(quiz.choices);

		const { question: again } = applyQuestionChange(back, {
			kind: "type",
			type: "puzzle",
			remembered,
		});
		expect(asPuzzle(again).items).toEqual(["Nilo", null, null, null]);
	});

	it("remembered puzzle content is checked as the edits are", () => {
		expect(() =>
			applyQuestionChange(aQuestion(), {
				kind: "type",
				type: "puzzle",
				remembered: { type: "puzzle", items: ["a".repeat(76)] },
			}),
		).toThrow(ChoiceTextTooLongError);
	});
});

describe("answer formatting changes (spec 048)", () => {
	const subscript2 = { subscript: [[1, 2] as [number, number]] };

	it("choiceText saves the text and its formatting", () => {
		const { question } = applyToQuiz(withChoices([null, null, null, null]), {
			kind: "choiceText",
			choiceId: "choice-1",
			text: "  H2O ",
			formatting: { subscript: [[3, 4]] },
		});

		expect(question.choices[0]).toEqual({
			id: "choice-1",
			text: "H2O",
			textFormatting: subscript2,
			image: null,
			correct: false,
		});
	});

	it("choiceText without marks clears the formatting", () => {
		const formatted = applyToQuiz(withChoices([null, null, null, null]), {
			kind: "choiceText",
			choiceId: "choice-1",
			text: "H2O",
			formatting: subscript2,
		}).question;

		const { question } = applyToQuiz(formatted, {
			kind: "choiceText",
			choiceId: "choice-1",
			text: "H2O",
		});

		expect(question.choices[0]?.textFormatting).toEqual({});
	});

	it("a blank answer stops being correct and has no formatting", () => {
		const formatted = applyToQuiz(
			withChoices(["Rio", "Lua", null, null], [0]),
			{
				kind: "choiceText",
				choiceId: "choice-1",
				text: "Rio",
				formatting: { bold: [[0, 3]] },
			},
		).question;

		const { question } = applyToQuiz(formatted, {
			kind: "choiceText",
			choiceId: "choice-1",
			text: "   ",
			formatting: { bold: [[0, 3]] },
		});

		expect(question.choices[0]).toEqual({
			id: "choice-1",
			text: null,
			textFormatting: {},
			image: null,
			correct: false,
		});
	});

	it("puzzleItemText saves the slot's formatting", () => {
		const { question } = applyQuestionChange(
			aPuzzleQuestion({ items: [null, null, null, null] }),
			{
				kind: "puzzleItemText",
				index: 2,
				text: "H2O",
				formatting: subscript2,
			},
		);

		expect(asPuzzle(question).items).toEqual([null, null, "H2O", null]);
		expect(asPuzzle(question).itemFormatting).toEqual([{}, {}, subscript2, {}]);
	});

	it("puzzleItemMoved carries the formatting with the text", () => {
		const puzzle = aPuzzleQuestion({
			items: ["H2O", "CO2", "Sal", null],
			itemFormatting: [subscript2, { subscript: [[2, 3]] }, {}, {}],
		});

		const { question } = applyQuestionChange(puzzle, {
			kind: "puzzleItemMoved",
			from: 1,
			to: 0,
		});

		expect(asPuzzle(question).items).toEqual(["CO2", "H2O", "Sal", null]);
		expect(asPuzzle(question).itemFormatting).toEqual([
			{ subscript: [[2, 3]] },
			subscript2,
			{},
			{},
		]);
	});

	it("removing the extra answers drops their formatting", () => {
		const six = applyToQuiz(withChoices(["A", "B", null, null]), {
			kind: "extraChoices",
			visible: true,
		}).question;
		const written = applyToQuiz(six, {
			kind: "choiceText",
			choiceId: "choice-5",
			text: "x2",
			formatting: { superscript: [[1, 2]] },
		}).question;

		const hidden = applyToQuiz(written, {
			kind: "extraChoices",
			visible: false,
		}).question;
		const back = applyToQuiz(hidden, {
			kind: "extraChoices",
			visible: true,
		}).question;

		expect(back.choices[4]).toEqual({
			id: "choice-5",
			text: null,
			textFormatting: {},
			image: null,
			correct: false,
		});
	});

	it("remembered content brings the answers' formatting back", () => {
		const quiz = applyToQuiz(withChoices([null, "Lua", null, null]), {
			kind: "choiceText",
			choiceId: "choice-1",
			text: "H2O",
			formatting: subscript2,
		}).question;
		const asTrueFalseQuestion = applyQuestionChange(quiz, {
			kind: "type",
			type: "trueFalse",
			remembered: null,
		}).question;

		const back = applyQuestionChange(asTrueFalseQuestion, {
			kind: "type",
			type: "quiz",
			remembered: questionContent(quiz),
		}).question;

		expect(asQuiz(back).choices[0]?.textFormatting).toEqual(subscript2);

		const puzzle = aPuzzleQuestion({
			items: ["H2O", "Sal", "Ar", null],
			itemFormatting: [subscript2, {}, { italic: [[0, 2]] }, {}],
		});
		const puzzleBack = applyQuestionChange(aQuestion(), {
			kind: "type",
			type: "puzzle",
			remembered: questionContent(puzzle),
		}).question;

		expect(asPuzzle(puzzleBack).itemFormatting).toEqual(puzzle.itemFormatting);
	});
});

describe("answer image changes (spec 049)", () => {
	const key = "media/ana/arroz.png";
	const water = { key, crop: null, altText: null };
	const square = { shape: "square", zoom: 2, x: 0.5, y: 0.5 };
	const choice1 = { choiceId: "choice-1" };

	function quizWithImage() {
		return applyToQuiz(withChoices(["Rio", "Lua", null, null], [0]), {
			kind: "answerImage",
			answer: choice1,
			key,
		}).question;
	}

	it("answerImage puts the image, drops the text and its formatting and keeps the correct mark", () => {
		const formatted = applyToQuiz(
			withChoices(["Rio", "Lua", null, null], [0]),
			{
				kind: "choiceText",
				choiceId: "choice-1",
				text: "Rio",
				formatting: { bold: [[0, 3]] },
			},
		).question;

		const { question } = applyToQuiz(formatted, {
			kind: "answerImage",
			answer: choice1,
			key,
		});

		expect(question.choices[0]).toEqual({
			id: "choice-1",
			text: null,
			textFormatting: {},
			image: water,
			correct: true,
		});
	});

	it("answerImage with null removes the image and the correct mark, leaving an empty answer", () => {
		const { question } = applyToQuiz(quizWithImage(), {
			kind: "answerImage",
			answer: choice1,
			key: null,
		});

		expect(question.choices[0]).toEqual({
			id: "choice-1",
			text: null,
			textFormatting: {},
			image: null,
			correct: false,
		});
	});

	it("answerImageCrop saves the crop and refuses a circle", () => {
		const { question } = applyToQuiz(quizWithImage(), {
			kind: "answerImageCrop",
			answer: choice1,
			crop: square,
		});

		expect(question.choices[0]?.image?.crop).toEqual(square);
		expect(() =>
			applyToQuiz(quizWithImage(), {
				kind: "answerImageCrop",
				answer: choice1,
				crop: { ...square, shape: "circle" },
			}),
		).toThrow(InvalidImageCropError);
	});

	it("answerImageAltText saves up to 1000 characters", () => {
		const { question } = applyToQuiz(quizWithImage(), {
			kind: "answerImageAltText",
			answer: choice1,
			altText: "  Arroz de cuxá ",
		});

		expect(question.choices[0]?.image?.altText).toBe("Arroz de cuxá");
		expect(() =>
			applyToQuiz(quizWithImage(), {
				kind: "answerImageAltText",
				answer: choice1,
				altText: "a".repeat(1001),
			}),
		).toThrow(ImageAltTextTooLongError);
	});

	it("crop or alt text on an answer without image is ANSWER_HAS_NO_IMAGE", () => {
		expect(() =>
			applyToQuiz(withChoices(["Rio", null, null, null]), {
				kind: "answerImageAltText",
				answer: choice1,
				altText: "x",
			}),
		).toThrow(AnswerHasNoImageError);
	});

	it("a text change on an image answer is ANSWER_HAS_IMAGE", () => {
		expect(() =>
			applyToQuiz(quizWithImage(), {
				kind: "choiceText",
				choiceId: "choice-1",
				text: "Rio",
			}),
		).toThrow(AnswerHasImageError);
		const puzzle = applyQuestionChange(aPuzzleQuestion(), {
			kind: "answerImage",
			answer: { slot: 0 },
			key,
		}).question;
		expect(() =>
			applyQuestionChange(puzzle, {
				kind: "puzzleItemText",
				index: 0,
				text: "Nilo",
			}),
		).toThrow(AnswerHasImageError);
	});

	it("puzzle slots take an image and puzzleItemMoved carries it", () => {
		const puzzle = applyQuestionChange(
			aPuzzleQuestion({ items: ["Nilo", "Amazonas", "Yangtzé", null] }),
			{ kind: "answerImage", answer: { slot: 1 }, key },
		).question;

		expect(asPuzzle(puzzle).items).toEqual(["Nilo", null, "Yangtzé", null]);
		expect(asPuzzle(puzzle).itemImages[1]).toEqual(water);

		const moved = applyQuestionChange(puzzle, {
			kind: "puzzleItemMoved",
			from: 1,
			to: 0,
		}).question;
		expect(asPuzzle(moved).items).toEqual([null, "Nilo", "Yangtzé", null]);
		expect(asPuzzle(moved).itemImages).toEqual([water, null, null, null]);
	});

	it("removing the extra answers drops their images", () => {
		const six = applyToQuiz(withChoices(["A", "B", null, null]), {
			kind: "extraChoices",
			visible: true,
		}).question;
		const withImage = applyToQuiz(six, {
			kind: "answerImage",
			answer: { choiceId: "choice-5" },
			key,
		}).question;
		const back = applyToQuiz(
			applyToQuiz(withImage, { kind: "extraChoices", visible: false }).question,
			{ kind: "extraChoices", visible: true },
		).question;

		expect(back.choices[4]?.image).toBeNull();
	});

	it("remembered content brings the images back, and refuses text and image together", () => {
		const quiz = quizWithImage();
		const back = applyQuestionChange(
			applyQuestionChange(quiz, {
				kind: "type",
				type: "trueFalse",
				remembered: null,
			}).question,
			{ kind: "type", type: "quiz", remembered: questionContent(quiz) },
		).question;

		expect(asQuiz(back).choices[0]?.image).toEqual(water);
		expect(() =>
			applyQuestionChange(aTrueFalseQuestion(), {
				kind: "type",
				type: "quiz",
				remembered: {
					type: "quiz",
					selection: "single",
					choices: [
						{ text: "Rio", image: water, correct: true },
						{ text: "Lua", correct: false },
						{ text: null, correct: false },
						{ text: null, correct: false },
					],
				},
			}),
		).toThrow(AnswerTextAndImageError);
	});
});
