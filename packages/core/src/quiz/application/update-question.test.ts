import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { QuestionTextTooLongError } from "../domain/question";
import { EmptyChoiceCannotBeCorrectError } from "../domain/question-change";
import { QuestionNotFoundError } from "../domain/question-list";
import { aQuestion, asQuiz, aTrueFalseQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { createUpdateQuestion, type UpdateQuestion } from "./update-question";

describe("updateQuestion", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let clock: FixedClock;
	let updateQuestion: UpdateQuestion;
	const ref = { ownerId: "user-1", quizId: "quiz-1", questionId: "a" };

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		updateQuestion = createUpdateQuestion({ quizzes, questions, clock });
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
});
