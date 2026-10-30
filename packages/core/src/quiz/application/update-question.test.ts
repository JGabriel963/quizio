import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { QuestionTextTooLongError } from "../domain/question";
import {
	EmptyChoiceCannotBeCorrectError,
	TimeLimitNotAllowedError,
} from "../domain/question-change";
import { QuestionNotFoundError } from "../domain/question-list";
import { newQuizVersion } from "../domain/quiz-version";
import { aQuestion, asQuiz, aTrueFalseQuestion } from "../testing/a-question";
import { aPublishedQuiz, aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import { createUpdateQuestion, type UpdateQuestion } from "./update-question";

describe("updateQuestion", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let versions: InMemoryQuizVersionRepository;
	let clock: FixedClock;
	let updateQuestion: UpdateQuestion;
	const ref = { ownerId: "user-1", quizId: "quiz-1", questionId: "a" };

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		versions = new InMemoryQuizVersionRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		updateQuestion = createUpdateQuestion({
			quizzes,
			questions,
			versions,
			storage: new InMemoryObjectStorage(),
			clock,
		});
		await quizzes.save(aQuiz());
		await quizzes.save(aQuiz({ id: "quiz-2" }));
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a", text: null }),
			aQuestion({ id: "b" }),
		]);
		await questions.saveList("quiz-2", [aQuestion({ id: "other" })]);
	});

	it("saves the parsed text and touches updatedAt", async () => {
		const result = await updateQuestion({
			...ref,
			change: { kind: "text", text: "  Qual é a capital do Brasil? " },
		});

		expect(result).toEqual({
			question: {
				...aQuestion({ id: "a" }),
				text: "Qual é a capital do Brasil?",
			},
			notice: null,
		});
		expect(questions.listOf("quiz-1")[0]?.text).toBe(
			"Qual é a capital do Brasil?",
		);
		expect((await quizzes.findById("quiz-1"))?.updatedAt).toEqual(clock.now());
	});

	it("saves the text and its formatting (spec 047, RN-18)", async () => {
		await updateQuestion({
			...ref,
			change: {
				kind: "text",
				text: "Qual destas não é uma capital?",
				formatting: { bold: [[12, 15]] },
			},
		});

		expect(questions.listOf("quiz-1")[0]).toMatchObject({
			text: "Qual destas não é uma capital?",
			textFormatting: { bold: [[12, 15]] },
		});
	});

	describe("on a published quiz", () => {
		const published = [
			aQuestion({ id: "a", text: "Capital do Brasil?" }),
			aQuestion({ id: "b" }),
		];

		beforeEach(async () => {
			await quizzes.save(aPublishedQuiz());
			await questions.saveList("quiz-1", published);
			await versions.save(
				newQuizVersion({
					quizId: "quiz-1",
					number: 1,
					questions: published,
					now: new Date("2026-02-01T10:00:00.000Z"),
				}),
			);
		});

		it("editing a published quiz keeps its version", async () => {
			await updateQuestion({
				...ref,
				change: { kind: "text", text: "Capital da Argentina?" },
			});

			expect(questions.listOf("quiz-1")[0]?.text).toBe("Capital da Argentina?");
			expect(versions.allOf("quiz-1")).toMatchObject([
				{ number: 1, questions: [{ text: "Capital do Brasil?" }, {}] },
			]);
			expect(await quizzes.findById("quiz-1")).toMatchObject({
				status: "published",
				publishedVersion: 1,
				hasUnpublishedChanges: true,
			});
		});

		it("a formatting change alone marks unpublished changes (spec 047, RN-19)", async () => {
			await updateQuestion({
				...ref,
				change: {
					kind: "text",
					text: "Capital do Brasil?",
					formatting: { bold: [[11, 17]] },
				},
			});

			expect((await quizzes.findById("quiz-1"))?.hasUnpublishedChanges).toBe(
				true,
			);
		});

		it("undoing an edit clears the flag", async () => {
			await updateQuestion({
				...ref,
				change: { kind: "timeLimit", seconds: 30 },
			});
			expect((await quizzes.findById("quiz-1"))?.hasUnpublishedChanges).toBe(
				true,
			);

			await updateQuestion({
				...ref,
				change: { kind: "timeLimit", seconds: 20 },
			});

			expect((await quizzes.findById("quiz-1"))?.hasUnpublishedChanges).toBe(
				false,
			);
		});
	});

	it("stores whitespace-only text as null", async () => {
		await updateQuestion({
			...ref,
			change: { kind: "text", text: "Capital?" },
		});

		const { question } = await updateQuestion({
			...ref,
			change: { kind: "text", text: "   " },
		});

		expect(question.text).toBeNull();
	});

	it("refuses more than 160 characters", async () => {
		await expect(
			updateQuestion({
				...ref,
				change: { kind: "text", text: "a".repeat(161) },
			}),
		).rejects.toThrow(QuestionTextTooLongError);
	});

	it("refuses a question from another quiz with QuestionNotFoundError", async () => {
		await expect(
			updateQuestion({
				...ref,
				questionId: "other",
				change: { kind: "text", text: "X" },
			}),
		).rejects.toThrow(QuestionNotFoundError);
		expect(questions.listOf("quiz-2")[0]?.text).not.toBe("X");
	});

	it("saves answers and returns the change's notice", async () => {
		await updateQuestion({
			...ref,
			change: { kind: "choiceText", choiceId: "choice-1", text: "Brasília" },
		});
		await updateQuestion({
			...ref,
			change: { kind: "choiceText", choiceId: "choice-2", text: "Rio" },
		});
		await updateQuestion({
			...ref,
			change: { kind: "choiceCorrect", choiceId: "choice-1", correct: true },
		});

		const result = await updateQuestion({
			...ref,
			change: { kind: "choiceCorrect", choiceId: "choice-2", correct: true },
		});

		expect(result.notice).toEqual({ kind: "multipleEnabled" });
		const stored = asQuiz(questions.listOf("quiz-1")[0]);
		expect(stored.selection).toBe("multiple");
		expect(stored.choices.slice(0, 2)).toEqual([
			{ id: "choice-1", text: "Brasília", correct: true },
			{ id: "choice-2", text: "Rio", correct: true },
		]);
	});

	it("changes the type and saves the new content", async () => {
		const result = await updateQuestion({
			...ref,
			questionId: "b",
			change: { kind: "type", type: "trueFalse", remembered: null },
		});

		const expected = aTrueFalseQuestion({
			id: "b",
			text: "Qual é a capital do Brasil?",
		});
		expect(result).toEqual({ question: expected, notice: null });
		expect(questions.listOf("quiz-1")[1]).toEqual(expected);

		await updateQuestion({
			...ref,
			questionId: "b",
			change: { kind: "trueFalseCorrect", correct: true },
		});

		expect(questions.listOf("quiz-1")[1]).toEqual({
			...expected,
			correct: true,
		});
	});

	it("saves time and points", async () => {
		await updateQuestion({
			...ref,
			change: { kind: "timeLimit", seconds: 45 },
		});
		await updateQuestion({
			...ref,
			change: { kind: "points", points: "double" },
		});

		expect(questions.listOf("quiz-1")[0]).toMatchObject({
			timeLimitSeconds: 45,
			points: "double",
		});
	});

	it("refuses an invalid change without saving", async () => {
		await expect(
			updateQuestion({
				...ref,
				change: { kind: "choiceCorrect", choiceId: "choice-1", correct: true },
			}),
		).rejects.toThrow(EmptyChoiceCannotBeCorrectError);
		expect((await quizzes.findById("quiz-1"))?.updatedAt).not.toEqual(
			clock.now(),
		);
	});

	it("saves an accepted answer (spec 031)", async () => {
		await updateQuestion({
			...ref,
			change: { kind: "type", type: "typeAnswer", remembered: null },
		});
		await updateQuestion({
			...ref,
			change: { kind: "acceptedAnswerText", index: 0, text: "Pedro" },
		});

		expect(questions.listOf("quiz-1")[0]).toMatchObject({
			type: "typeAnswer",
			timeLimitSeconds: 20,
			acceptedAnswers: ["Pedro"],
		});
	});

	it("writes and moves puzzle slots (spec 033)", async () => {
		await updateQuestion({
			...ref,
			change: { kind: "type", type: "puzzle", remembered: null },
		});
		for (const [index, text] of ["Nilo", "Amazonas", "Yangtzé"].entries()) {
			await updateQuestion({
				...ref,
				change: { kind: "puzzleItemText", index, text },
			});
		}
		await updateQuestion({
			...ref,
			change: { kind: "puzzleItemMoved", from: 2, to: 0 },
		});

		expect(questions.listOf("quiz-1")[0]).toMatchObject({
			type: "puzzle",
			timeLimitSeconds: 20,
			items: ["Yangtzé", "Nilo", "Amazonas", null],
		});
	});

	it("refuses a time the type does not take (spec 031)", async () => {
		await updateQuestion({
			...ref,
			change: { kind: "type", type: "typeAnswer", remembered: null },
		});

		await expect(
			updateQuestion({ ...ref, change: { kind: "timeLimit", seconds: 5 } }),
		).rejects.toThrow(TimeLimitNotAllowedError);
	});
});
