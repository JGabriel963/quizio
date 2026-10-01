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
			change: { kind: "text", text: "Capital?" },
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
			question: { ...first, id: expect.any(String), text: "Capital?" },
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

	it("update saves answers, corrects, time and points and returns the notice", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const { questions } = await ana.quiz.editor({ quizId });
		const ref = { quizId, questionId: questions[0]?.id ?? "" };

		await ana.quiz.questions.update({
			...ref,
			change: { kind: "choiceText", choiceId: "choice-1", text: "Brasília" },
		});
		await ana.quiz.questions.update({
			...ref,
			change: { kind: "choiceText", choiceId: "choice-2", text: "Rio" },
		});
		await ana.quiz.questions.update({
			...ref,
			change: { kind: "choiceCorrect", choiceId: "choice-1", correct: true },
		});
		const second = await ana.quiz.questions.update({
			...ref,
			change: { kind: "choiceCorrect", choiceId: "choice-2", correct: true },
		});
		await ana.quiz.questions.update({
			...ref,
			change: { kind: "timeLimit", seconds: 90 },
		});
		await ana.quiz.questions.update({
			...ref,
			change: { kind: "points", points: "double" },
		});
		await ana.quiz.questions.update({
			...ref,
			change: { kind: "extraChoices", visible: true },
		});
		const { questions: after } = await ana.quiz.editor({ quizId });

		expect(second.notice).toEqual({ kind: "multipleEnabled" });
		expect(after[0]).toMatchObject({
			selection: "multiple",
			timeLimitSeconds: 90,
			points: "double",
		});
		expect(after[0]?.choices).toHaveLength(6);
		expect(after[0]?.choices.slice(0, 2)).toEqual([
			{ id: "choice-1", text: "Brasília", correct: true },
			{ id: "choice-2", text: "Rio", correct: true },
		]);
	});

	it("update refuses an answer over 75 characters with its domainCode", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		const { questions } = await ana.quiz.editor({ quizId });

		const error = await failureOf(
			ana.quiz.questions.update({
				quizId,
				questionId: questions[0]?.id ?? "",
				change: {
					kind: "choiceText",
					choiceId: "choice-1",
					text: "a".repeat(76),
				},
			}),
		);

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.CHOICE_TEXT_TOO_LONG" },
		});
	});

	it("applyTimeLimitToAll sets every question's time and returns the count", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});
		await ana.quiz.questions.add({ quizId, afterQuestionId: null });
		await ana.quiz.questions.add({ quizId, afterQuestionId: null });

		const result = await ana.quiz.questions.applyTimeLimitToAll({
			quizId,
			seconds: 45,
		});
		const { questions } = await ana.quiz.editor({ quizId });

		expect(result).toEqual({ updatedCount: 3 });
		expect(questions.map((question) => question.timeLimitSeconds)).toEqual([
			45, 45, 45,
		]);
	});

	it("applyTimeLimitToAll refuses a time outside the list", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { id: quizId } = await ana.quiz.create({});

		const error = await failureOf(
			ana.quiz.questions.applyTimeLimitToAll({ quizId, seconds: 25 }),
		);

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.INVALID_TIME_LIMIT" },
		});
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
					change: { kind: "text", text: "X" },
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
