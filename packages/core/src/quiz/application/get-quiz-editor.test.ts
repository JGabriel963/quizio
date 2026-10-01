import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { blankQuestion } from "../domain/question";
import { QuizInTrashError, QuizNotFoundError } from "../domain/quiz";
import { newQuizVersion } from "../domain/quiz-version";
import { aQuestion } from "../testing/a-question";
import { aPublishedQuiz, aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { InMemoryQuizVersionRepository } from "../testing/in-memory-quiz-version-repository";
import { createGetQuizEditor, type GetQuizEditor } from "./get-quiz-editor";

describe("getQuizEditor", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let versions: InMemoryQuizVersionRepository;
	let getQuizEditor: GetQuizEditor;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		versions = new InMemoryQuizVersionRepository();
		getQuizEditor = createGetQuizEditor({
			quizzes,
			questions,
			versions,
			storage: new InMemoryObjectStorage("https://media.test"),
			ids: new SequentialIdGenerator("question"),
		});
	});

	it("returns the quiz details and its questions in order", async () => {
		await quizzes.save(aQuiz());
		const b = aQuestion({ id: "b", text: "B" });
		const a = aQuestion({ id: "a", text: "A" });
		await questions.saveList("quiz-1", [b, a]);

		const editor = await getQuizEditor({ ownerId: "user-1", quizId: "quiz-1" });

		expect(editor.quiz).toEqual(
			expect.objectContaining({
				id: "quiz-1",
				title: "Bom de Bíblia (Junho)",
				questionCount: 2,
			}),
		);
		expect(editor.questions).toEqual([b, a]);
		expect(editor.publishedQuestions).toBeNull();
	});

	it("returns the published questions of a published quiz", async () => {
		const published = aQuestion({ id: "a", text: "Capital do Brasil?" });
		await quizzes.save(aPublishedQuiz({ hasUnpublishedChanges: true }));
		await versions.save(
			newQuizVersion({
				quizId: "quiz-1",
				number: 1,
				questions: [published],
				now: new Date("2026-02-01T10:00:00.000Z"),
			}),
		);
		await questions.saveList("quiz-1", [
			{ ...published, text: "Capital da Argentina?" },
		]);

		const editor = await getQuizEditor({ ownerId: "user-1", quizId: "quiz-1" });

		expect(editor.quiz).toMatchObject({
			status: "published",
			publishedVersion: 1,
			hasUnpublishedChanges: true,
		});
		expect(editor.questions[0]?.text).toBe("Capital da Argentina?");
		expect(editor.publishedQuestions).toEqual([published]);
	});

	it("hides missing and foreign quizzes behind QuizNotFoundError", async () => {
		await quizzes.save(aQuiz({ ownerId: "user-2" }));

		await expect(
			getQuizEditor({ ownerId: "user-1", quizId: "quiz-1" }),
		).rejects.toThrow(QuizNotFoundError);
		await expect(
			getQuizEditor({ ownerId: "user-1", quizId: "missing" }),
		).rejects.toThrow(QuizNotFoundError);
	});

	it("refuses a trashed quiz with QuizInTrashError without writing", async () => {
		await quizzes.save(aQuiz({ trashedAt: new Date("2026-02-01T10:00:00Z") }));

		await expect(
			getQuizEditor({ ownerId: "user-1", quizId: "quiz-1" }),
		).rejects.toThrow(QuizInTrashError);
		expect(questions.listOf("quiz-1")).toEqual([]);
	});

	it("gives a question-less quiz one blank question without touching updatedAt", async () => {
		const quiz = aQuiz();
		await quizzes.save(quiz);

		const editor = await getQuizEditor({ ownerId: "user-1", quizId: "quiz-1" });

		const blank = blankQuestion("question-1");
		expect(editor.questions).toEqual([blank]);
		expect(editor.quiz.questionCount).toBe(1);
		expect(questions.listOf("quiz-1")).toEqual([blank]);
		expect((await quizzes.findById("quiz-1"))?.updatedAt).toEqual(
			quiz.updatedAt,
		);
	});
});
