import { describe, expect, it } from "vitest";

import { aQuestion } from "../testing/a-question";
import {
	ChoiceTextTooLongError,
	InvalidQuestionPointsError,
	InvalidSelectionModeError,
	InvalidTimeLimitError,
	type Question,
	QuestionTextTooLongError,
} from "./question";
import {
	applyQuestionChange,
	ChoiceNotFoundError,
	EmptyChoiceCannotBeCorrectError,
} from "./question-change";

function withChoices(
	texts: (string | null)[],
	correct: number[] = [],
	overrides: Partial<Question> = {},
): Question {
	return aQuestion({
		choices: texts.map((text, index) => ({
			id: `choice-${index + 1}`,
			text,
			correct: correct.includes(index),
		})),
		...overrides,
	});
}

describe("applyQuestionChange", () => {
	describe("text", () => {
		it("parses the question text", () => {
			const { question, notice } = applyQuestionChange(aQuestion(), {
				kind: "text",
				text: "  Capital?  ",
			});

			expect(question.text).toBe("Capital?");
			expect(notice).toBeNull();
		});

		it("refuses more than 120 characters", () => {
			expect(() =>
				applyQuestionChange(aQuestion(), {
					kind: "text",
					text: "a".repeat(121),
				}),
			).toThrow(QuestionTextTooLongError);
		});
	});

	describe("choice text", () => {
		it("trims the answer and keeps the other fields", () => {
			const source = withChoices(["Rio", null, null, null], [0]);

			const { question } = applyQuestionChange(source, {
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
				applyQuestionChange(source, {
					kind: "choiceText",
					choiceId: "choice-1",
					text: "a".repeat(75),
				}).question.choices[0]?.text,
			).toHaveLength(75);
			expect(() =>
				applyQuestionChange(source, {
					kind: "choiceText",
					choiceId: "choice-1",
					text: "a".repeat(76),
				}),
			).toThrow(ChoiceTextTooLongError);
		});

		it("clearing a correct answer also unmarks it", () => {
			const source = withChoices(["Brasília", "Rio", null, null], [0]);

			const { question } = applyQuestionChange(source, {
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

			applyQuestionChange(source, {
				kind: "choiceText",
				choiceId: "choice-1",
				text: "Rio",
			});

			expect(source.choices[0]?.text).toBeNull();
		});
	});

	describe("correct", () => {
		it("marks an answer with text as correct", () => {
			const { question, notice } = applyQuestionChange(
				withChoices(["Brasília", "Rio", null, null]),
				{ kind: "choiceCorrect", choiceId: "choice-1", correct: true },
			);

			expect(question.choices[0]?.correct).toBe(true);
			expect(notice).toBeNull();
		});

		it("refuses to mark an empty answer as correct", () => {
			expect(() =>
				applyQuestionChange(withChoices(["Brasília", null, null, null]), {
					kind: "choiceCorrect",
					choiceId: "choice-2",
					correct: true,
				}),
			).toThrow(EmptyChoiceCannotBeCorrectError);
		});

		it("a second correct in single selection switches to multiple with a notice", () => {
			const { question, notice } = applyQuestionChange(
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
			const { notice } = applyQuestionChange(
				withChoices(["Brasília", "Rio", null, null], [0], {
					selection: "multiple",
				}),
				{ kind: "choiceCorrect", choiceId: "choice-2", correct: true },
			);

			expect(notice).toBeNull();
		});

		it("unmarks an answer", () => {
			const { question } = applyQuestionChange(
				withChoices(["Brasília", "Rio", null, null], [0]),
				{ kind: "choiceCorrect", choiceId: "choice-1", correct: false },
			);

			expect(question.choices[0]?.correct).toBe(false);
		});
	});

	describe("selection", () => {
		it("switching to single keeps the first correct and reports how many were cleared", () => {
			const { question, notice } = applyQuestionChange(
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
			const { question, notice } = applyQuestionChange(
				withChoices(["A", "B", null, null], [1], { selection: "multiple" }),
				{ kind: "selection", selection: "single" },
			);

			expect(question.choices[1]?.correct).toBe(true);
			expect(notice).toBeNull();
		});

		it("switches to multiple", () => {
			const { question, notice } = applyQuestionChange(aQuestion(), {
				kind: "selection",
				selection: "multiple",
			});

			expect(question.selection).toBe("multiple");
			expect(notice).toBeNull();
		});

		it("refuses an unknown mode", () => {
			expect(() =>
				applyQuestionChange(aQuestion(), {
					kind: "selection",
					selection: "all",
				}),
			).toThrow(InvalidSelectionModeError);
		});
	});

	describe("extra choices", () => {
		it("showing them adds slots 5 and 6", () => {
			const { question } = applyQuestionChange(aQuestion(), {
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

			const { question } = applyQuestionChange(source, {
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

			const { question } = applyQuestionChange(source, {
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
				applyQuestionChange(aQuestion(), { kind: "timeLimit", seconds: 90 })
					.question.timeLimitSeconds,
			).toBe(90);
		});

		it("refuses a time outside the list", () => {
			expect(() =>
				applyQuestionChange(aQuestion(), { kind: "timeLimit", seconds: 25 }),
			).toThrow(InvalidTimeLimitError);
		});

		it("sets the points", () => {
			expect(
				applyQuestionChange(aQuestion(), { kind: "points", points: "double" })
					.question.points,
			).toBe("double");
		});

		it("refuses unknown points", () => {
			expect(() =>
				applyQuestionChange(aQuestion(), { kind: "points", points: "triple" }),
			).toThrow(InvalidQuestionPointsError);
		});
	});

	describe("unknown choice", () => {
		it("refuses a choice the question does not have", () => {
			expect(() =>
				applyQuestionChange(aQuestion(), {
					kind: "choiceText",
					choiceId: "choice-5",
					text: "Salvador",
				}),
			).toThrow(ChoiceNotFoundError);
			expect(() =>
				applyQuestionChange(aQuestion(), {
					kind: "choiceCorrect",
					choiceId: "nope",
					correct: true,
				}),
			).toThrow(ChoiceNotFoundError);
		});
	});
});
