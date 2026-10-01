import { beforeEach, describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import {
	QuizInTrashError,
	QuizNotFoundError,
	QuizNotPublishedError,
} from "../domain/quiz";
import { newQuizVersion } from "../domain/quiz-version";
import { aQuestion, aTrueFalseQuestion } from "../testing/a-question";
import { aPublishedQuiz, aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import {
	createDiscardQuizChanges,
	type DiscardQuizChanges,
} from "./discard-quiz-changes";

const a = aQuestion({ id: "a", text: "A" });
const b = aTrueFalseQuestion({ id: "b", text: "B", correct: true });

describe("discardQuizChanges", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let versions: InMemoryQuizVersionRepository;
	let clock: FixedClock;
	let discardQuizChanges: DiscardQuizChanges;
	const ref = { ownerId: "user-1", quizId: "quiz-1" };

	beforeEach(async () => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		versions = new InMemoryQuizVersionRepository();
		clock = new FixedClock("2026-06-01T12:00:00.000Z");
		discardQuizChanges = createDiscardQuizChanges({
			quizzes,
			questions,
			versions,
			storage: new InMemoryObjectStorage("https://media.test"),
			clock,
		});
		await versions.save(
			newQuizVersion({
				quizId: "quiz-1",
				number: 1,
				questions: [a, b],
				now: new Date("2026-02-01T10:00:00.000Z"),
			}),
		);
	});

	it("restores the questions of the current version", async () => {
		await quizzes.save(aPublishedQuiz({ hasUnpublishedChanges: true }));
		// A edited, B deleted and C added since the version was saved.
		await questions.saveList("quiz-1", [
			{ ...a, text: "A mudou" },
			aQuestion({ id: "c", text: "C" }),
		]);

		const editor = await discardQuizChanges(ref);

		expect(questions.listOf("quiz-1")).toEqual([a, b]);
		expect(editor.questions).toEqual([a, b]);
		expect(editor.publishedQuestions).toEqual([a, b]);
		expect(editor.quiz).toMatchObject({
			status: "published",
			publishedVersion: 1,
			hasUnpublishedChanges: false,
			questionCount: 2,
			updatedAt: clock.now(),
		});
		expect(await quizzes.findById("quiz-1")).toMatchObject({
			hasUnpublishedChanges: false,
			updatedAt: clock.now(),
		});
	});

	it("keeps the quiz details", async () => {
		await quizzes.save(
			aPublishedQuiz({
				title: "Geografia 2",
				description: "Nova descrição",
				hasUnpublishedChanges: true,
			}),
		);
		await questions.saveList("quiz-1", [{ ...a, timeLimitSeconds: 45 }, b]);

		await discardQuizChanges(ref);

		expect(questions.listOf("quiz-1")[0]?.timeLimitSeconds).toBe(20);
		expect(await quizzes.findById("quiz-1")).toMatchObject({
			title: "Geografia 2",
			description: "Nova descrição",
		});
	});

	it("uses the version in force, not an older one", async () => {
		await versions.save(
			newQuizVersion({
				quizId: "quiz-1",
				number: 2,
				questions: [b],
				now: new Date("2026-03-01T10:00:00.000Z"),
			}),
		);
		await quizzes.save(aPublishedQuiz({ publishedVersion: 2 }));
		await questions.saveList("quiz-1", [a]);

		await discardQuizChanges(ref);

		expect(questions.listOf("quiz-1")).toEqual([b]);
	});

	it("refuses a draft", async () => {
		await quizzes.save(aQuiz());
		await questions.saveList("quiz-1", [a]);

		await expect(discardQuizChanges(ref)).rejects.toThrow(
			QuizNotPublishedError,
		);
		expect(questions.listOf("quiz-1")).toEqual([a]);
	});

	it("hides other owners' quizzes and refuses trashed ones", async () => {
		await quizzes.save(
			aPublishedQuiz({ trashedAt: new Date("2026-05-01T00:00:00.000Z") }),
		);
		await questions.saveList("quiz-1", [a]);

		await expect(
			discardQuizChanges({ ownerId: "user-2", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
		await expect(discardQuizChanges(ref)).rejects.toThrow(QuizInTrashError);
		expect(questions.listOf("quiz-1")).toEqual([a]);
	});
});
