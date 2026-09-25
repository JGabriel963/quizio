import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

const failureOf = (promise: Promise<unknown>) =>
	promise.then(
		() => {
			throw new Error("Expected the call to fail");
		},
		(error: unknown) => error,
	);

describe("quiz.questions router", () => {
	it("add, duplicate, move, delete and restore round-trip through quiz.editor", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const {
			questions: [first],
		} = await ana.quiz.editor({ quizId });
		const firstId = first?.id ?? "";

		await ana.quiz.questions.update({
			quizId,
			questionId: firstId,
			changes: { text: "Capital?" },
		});
		const added = await ana.quiz.questions.add({
			quizId,
			afterQuestionId: firstId,
		});
		const copy = await ana.quiz.questions.duplicate({
			quizId,
			questionId: firstId,
		});
		await ana.quiz.questions.move({
			quizId,
			questionId: added.question.id,
			toIndex: 0,
		});
		const deleted = await ana.quiz.questions.delete({
			quizId,
			questionId: copy.question.id,
		});
		const afterDelete = await ana.quiz.editor({ quizId });
		await ana.quiz.questions.restore({ quizId, ...deleted });
		const afterRestore = await ana.quiz.editor({ quizId });

		expect(added.index).toBe(1);
		expect(copy).toEqual({
			question: { id: expect.any(String), type: "quiz", text: "Capital?" },
			index: 1,
		});
		expect(afterDelete.questions.map(({ id }) => id)).toEqual([
			added.question.id,
			firstId,
		]);
		// The copy sat at index 2 after the move, so the undo puts it back there.
		expect(deleted.index).toBe(2);
		expect(afterRestore.questions.map(({ id }) => id)).toEqual([
			added.question.id,
			firstId,
			copy.question.id,
		]);
		expect(afterRestore.quiz.questionCount).toBe(3);
	});

	it("delete of the only question is BAD_REQUEST with domainCode QUIZ.LAST_QUESTION", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const { questions } = await ana.quiz.editor({ quizId });

		const error = await failureOf(
			ana.quiz.questions.delete({
				quizId,
				questionId: questions[0]?.id ?? "",
			}),
		);

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.LAST_QUESTION" },
		});
	});

	it("update refuses visitors", async () => {
		const error = await failureOf(
			createTestApi()
				.callerFor(null)
				.quiz.questions.update({
					quizId: "quiz-1",
					questionId: "question-1",
					changes: { text: "X" },
				}),
		);

		expect(error).toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("operations on another owner's quiz are NOT_FOUND", async () => {
		const api = createTestApi();
		const { id: quizId } = await api.callerFor("user-1").quiz.create({});

		const error = await failureOf(
			api
				.callerFor("user-2")
				.quiz.questions.add({ quizId, afterQuestionId: null }),
		);

		expect(error).toMatchObject({
			code: "NOT_FOUND",
			cause: { code: "QUIZ.NOT_FOUND" },
		});
	});

	it("rejects a negative position at the boundary", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});

		const error = await failureOf(
			ana.quiz.questions.move({ quizId, questionId: "x", toIndex: -1 }),
		);

		expect(error).toMatchObject({ code: "BAD_REQUEST" });
	});
});
