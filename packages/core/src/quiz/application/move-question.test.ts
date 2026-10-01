import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InvalidQuestionPositionError } from "../domain/question-list";
import { aQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import { createMoveQuestion, type MoveQuestion } from "./move-question";

describe("moveQuestion", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let clock: FixedClock;
	let moveQuestion: MoveQuestion;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		moveQuestion = createMoveQuestion({
			quizzes,
			questions,
			versions: new InMemoryQuizVersionRepository(),
			clock,
		});
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [
			aQuestion({ id: "a" }),
			aQuestion({ id: "b" }),
			aQuestion({ id: "c" }),
		]);
	});

	it("persists the new order", async () => {
		await moveQuestion({ ...ref, questionId: "c", toIndex: 0 });

		expect(questions.listOf("quiz-1").map(({ id }) => id)).toEqual([
			"c",
			"a",
			"b",
		]);
		expect((await quizzes.findById("quiz-1"))?.updatedAt).toEqual(clock.now());
	});

	it("refuses an index outside the list", async () => {
		await expect(
			moveQuestion({ ...ref, questionId: "a", toIndex: 3 }),
		).rejects.toThrow(InvalidQuestionPositionError);
	});
});
