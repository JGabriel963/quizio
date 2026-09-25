import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { QuestionTextTooLongError } from "../domain/question";
import { QuestionNotFoundError } from "../domain/question-list";
import { aQuestion } from "../testing/a-question";
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
		const view = await updateQuestion({
			...ref,
			changes: { text: "  Qual é a capital do Brasil? " },
		});

		expect(view).toEqual({
			id: "a",
			type: "quiz",
			text: "Qual é a capital do Brasil?",
		});
		expect(questions.listOf("quiz-1")[0]?.text).toBe(
			"Qual é a capital do Brasil?",
		);
		expect((await quizzes.findById("quiz-1"))?.updatedAt).toEqual(clock.now());
	});

	it("stores whitespace-only text as null", async () => {
		await updateQuestion({ ...ref, changes: { text: "Capital?" } });

		const view = await updateQuestion({ ...ref, changes: { text: "   " } });

		expect(view.text).toBeNull();
	});

	it("refuses more than 120 characters", async () => {
		await expect(
			updateQuestion({ ...ref, changes: { text: "a".repeat(121) } }),
		).rejects.toThrow(QuestionTextTooLongError);
	});

	it("refuses a question from another quiz with QuestionNotFoundError", async () => {
		await expect(
			updateQuestion({ ...ref, questionId: "other", changes: { text: "X" } }),
		).rejects.toThrow(QuestionNotFoundError);
		expect(questions.listOf("quiz-2")[0]?.text).not.toBe("X");
	});
});
