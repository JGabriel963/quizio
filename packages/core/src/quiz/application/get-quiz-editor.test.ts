import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { SequentialIdGenerator } from "../../shared/testing/sequential-id-generator";
import { QuizInTrashError, QuizNotFoundError } from "../domain/quiz";
import { aQuestion } from "../testing/a-question";
import { aQuiz } from "../testing/a-quiz";
import { InMemoryQuestionRepository } from "../testing/in-memory-question-repository";
import { InMemoryQuizRepository } from "../testing/in-memory-quiz-repository";
import { createGetQuizEditor, type GetQuizEditor } from "./get-quiz-editor";

describe("getQuizEditor", () => {
	let quizzes: InMemoryQuizRepository;
	let questions: InMemoryQuestionRepository;
	let getQuizEditor: GetQuizEditor;

	beforeEach(() => {
		quizzes = new InMemoryQuizRepository();
		questions = new InMemoryQuestionRepository();
		getQuizEditor = createGetQuizEditor({
			quizzes,
			questions,
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
		expect(editor.questions).toEqual([
			{ id: "b", type: "quiz", text: "B" },
			{ id: "a", type: "quiz", text: "A" },
		]);
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

		const blank = { id: "question-1", type: "quiz", text: null };
		expect(editor.questions).toEqual([blank]);
		expect(editor.quiz.questionCount).toBe(1);
		expect(questions.listOf("quiz-1")).toEqual([blank]);
		expect((await quizzes.findById("quiz-1"))?.updatedAt).toEqual(
			quiz.updatedAt,
		);
	});
});
