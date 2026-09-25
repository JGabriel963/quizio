import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { QuestionTextTooLongError } from "../domain/question";
import { aQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import {
	createRestoreQuestion,
	type RestoreQuestion,
} from "./restore-question";

describe("restoreQuestion", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let clock: FixedClock;
	let restoreQuestion: RestoreQuestion;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };
	const b = { id: "b", type: "quiz", text: "B" } as const;

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		restoreQuestion = createRestoreQuestion({ quizzes, questions, clock });
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a" }),
			aQuestion({ id: "c" }),
		]);
	});

	const storedIds = () => questions.listOf("quiz-1").map(({ id }) => id);

	it("puts the question back at its index", async () => {
		const result = await restoreQuestion({ ...ref, question: b, index: 1 });

		expect(result).toEqual({ index: 1 });
		expect(storedIds()).toEqual(["a", "b", "c"]);
		expect(questions.listOf("quiz-1")[1]).toEqual(b);
		expect((await quizzes.findById("quiz-1"))?.updatedAt).toEqual(clock.now());
	});

	it("a repeated restore is a no-op", async () => {
		await restoreQuestion({ ...ref, question: b, index: 1 });

		const again = await restoreQuestion({ ...ref, question: b, index: 0 });

		expect(again).toEqual({ index: 1 });
		expect(storedIds()).toEqual(["a", "b", "c"]);
	});

	it("revalidates the restored text", async () => {
		await expect(
			restoreQuestion({
				...ref,
				question: { ...b, text: "a".repeat(121) },
				index: 1,
			}),
		).rejects.toThrow(QuestionTextTooLongError);
		expect(storedIds()).toEqual(["a", "c"]);
	});
});
