import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { QuizInTrashError, QuizNotFoundError, trashQuiz } from "../domain/quiz";
import { InvalidQuizVisibilityError } from "../domain/quiz-details";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import {
	createSetQuizVisibility,
	type SetQuizVisibility,
} from "./set-quiz-visibility";

describe("setQuizVisibility (spec 039, RN-25a)", () => {
	let quizzes: InMemoryQuizRepository;
	let clock: FixedClock;
	let setVisibility: SetQuizVisibility;

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		clock = new FixedClock("2026-10-27T12:00:00.000Z");
		setVisibility = createSetQuizVisibility({
			quizzes,
			questions: new InMemoryQuestionRepository(),
			storage: new InMemoryObjectStorage(),
			clock,
		});
		await quizzes.save(aQuiz({ id: "quiz-1", ownerId: "user-1" }));
	});

	it("sets public on an owned quiz", async () => {
		const view = await setVisibility({
			ownerId: "user-1",
			quizId: "quiz-1",
			visibility: "public",
		});

		expect(view.visibility).toBe("public");
		expect(await quizzes.findById("quiz-1")).toMatchObject({
			visibility: "public",
			updatedAt: clock.now(),
		});
	});

	it("another owner's quiz is not found", async () => {
		await expect(
			setVisibility({
				ownerId: "user-2",
				quizId: "quiz-1",
				visibility: "public",
			}),
		).rejects.toThrow(QuizNotFoundError);
	});

	it("a trashed quiz cannot change", async () => {
		const quiz = await quizzes.findById("quiz-1");
		if (!quiz) {
			throw new Error("The quiz should exist");
		}
		await quizzes.save(trashQuiz(quiz, clock.now()));

		await expect(
			setVisibility({
				ownerId: "user-1",
				quizId: "quiz-1",
				visibility: "public",
			}),
		).rejects.toThrow(QuizInTrashError);
	});

	it("refuses unlisted", async () => {
		await expect(
			setVisibility({
				ownerId: "user-1",
				quizId: "quiz-1",
				visibility: "unlisted",
			}),
		).rejects.toThrow(InvalidQuizVisibilityError);
	});
});
