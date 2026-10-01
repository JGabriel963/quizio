import { describe, expect, it } from "vitest";

import {
	aQuestion,
	asQuiz,
	asTrueFalse,
	aTrueFalseQuestion,
} from "../testing/a-question";
import {
	ChoiceTextTooLongError,
	InvalidQuestionPointsError,
	InvalidQuestionTypeError,
	InvalidSelectionModeError,
	InvalidTimeLimitError,
	QuestionTextTooLongError,
	type QuizQuestion,
	questionContent,
} from "./question";
import {
	applyQuestionChange,
	ChoiceNotFoundError,
	EmptyChoiceCannotBeCorrectError,
	type QuestionChange,
	QuestionChangeNotApplicableError,
} from "./question-change";

function withChoices(
	texts: (string | null)[],
	correct: number[] = [],
	overrides: Partial<QuizQuestion> = {},
): QuizQuestion {
	return aQuestion({
		choices: texts.map((text, index) => ({
			id: `choice-${index + 1}`,
			text,
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
			timeLimitSeconds: 30,
			points: "double",
			image: null,
			correct: null,
		});
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
				type: "slider",
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
