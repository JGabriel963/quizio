import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { LastQuestionError } from "../domain/question-list";
import { aQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { createDeleteQuestion, type DeleteQuestion } from "./delete-question";

describe("deleteQuestion", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let clock: FixedClock;
	let deleteQuestion: DeleteQuestion;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };
	const b = aQuestion({ id: "b", text: "B" });

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		deleteQuestion = createDeleteQuestion({ quizzes, questions, clock });
		await quizzes.save(aQuiz());
	});

	it("removes the question and returns it with its index", async () => {
		await questions.saveList("quiz-1", [aQuestion({ id: "a" }), b]);

		const result = await deleteQuestion({ ...ref, questionId: "b" });

		expect(result).toEqual({
			question: { id: "b", type: "quiz", text: "B" },
			index: 1,
		});
		expect(questions.listOf("quiz-1").map(({ id }) => id)).toEqual(["a"]);
		expect((await quizzes.findById("quiz-1"))?.updatedAt).toEqual(clock.now());
	});

	it("refuses to delete the only question", async () => {
		await questions.saveList("quiz-1", [b]);

		await expect(deleteQuestion({ ...ref, questionId: "b" })).rejects.toThrow(
			LastQuestionError,
		);
		expect(questions.listOf("quiz-1")).toEqual([b]);
	});
});
