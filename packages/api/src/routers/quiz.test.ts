import { blankQuestion } from "@quizio/core/quiz/domain/question";
import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

const failureOf = (promise: Promise<unknown>) =>
	promise.then(
		() => {
			throw new Error("Expected the call to fail");
		},
		(error: unknown) => error,
	);

/** Creates a quiz whose only question is complete, ready to be published. */
async function aCompleteQuiz(
	caller: ReturnType<ReturnType<typeof createTestApi>["callerFor"]>,
	title: string | null = "Geografia",
) {
	const quiz = await caller.quiz.create({ title });
	const { questions } = await caller.quiz.editor({ quizId: quiz.id });
	const questionId = questions[0]?.id ?? "";
	const update = (
		change: Parameters<typeof caller.quiz.questions.update>[0]["change"],
	) => caller.quiz.questions.update({ quizId: quiz.id, questionId, change });
	await update({ kind: "text", text: "Qual é a capital do Brasil?" });
	await update({ kind: "choiceText", choiceId: "choice-1", text: "Brasília" });
	await update({ kind: "choiceText", choiceId: "choice-2", text: "Rio" });
	await update({ kind: "choiceCorrect", choiceId: "choice-1", correct: true });
	return { quizId: quiz.id, questionId };
}

describe("quiz publishing", () => {
	it("publishes a quiz and lists it out of the drafts", async () => {
		const api = createTestApi();
		const ana = api.callerFor("user-1");
		const { quizId } = await aCompleteQuiz(ana);

		const published = await ana.quiz.publish({ quizId });

		expect(published).toMatchObject({
			status: "published",
			publishedVersion: 1,
			hasUnpublishedChanges: false,
		});
		expect(await ana.library.list({ section: "drafts" })).toEqual([]);
		expect(await ana.library.list({ section: "recent" })).toMatchObject([
			{ id: quizId, status: "published", hasUnpublishedChanges: false },
		]);
		const editor = await ana.quiz.editor({ quizId });
		expect(editor.publishedQuestions).toEqual(editor.questions);
		expect(api.versions.allOf(quizId)).toHaveLength(1);
	});

	it("an edit after publishing shows as unpublished changes until published again", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { quizId, questionId } = await aCompleteQuiz(ana);
		await ana.quiz.publish({ quizId });

		await ana.quiz.questions.update({
			quizId,
			questionId,
			change: { kind: "timeLimit", seconds: 30 },
		});

		expect(await ana.library.list({ section: "recent" })).toMatchObject([
			{ status: "published", hasUnpublishedChanges: true },
		]);
		expect(await ana.library.list({ section: "drafts" })).toEqual([]);
		expect(await ana.quiz.get({ quizId })).toMatchObject({
			publishedVersion: 1,
			hasUnpublishedChanges: true,
		});

		expect(await ana.quiz.publish({ quizId })).toMatchObject({
			publishedVersion: 2,
			hasUnpublishedChanges: false,
		});
	});

	it("publishes with the finishing touches", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { quizId } = await aCompleteQuiz(ana, null);

		const published = await ana.quiz.publish({
			quizId,
			details: { title: "Capitais do mundo", description: "Para a aula" },
		});

		expect(published).toMatchObject({
			title: "Capitais do mundo",
			description: "Para a aula",
			status: "published",
		});
	});

	it("publish maps refusals to domain codes", async () => {
		const api = createTestApi();
		const ana = api.callerFor("user-1");
		const incomplete = await ana.quiz.create({ title: "Geografia" });
		const untitled = await aCompleteQuiz(ana, null);
		const trashed = await aCompleteQuiz(ana);
		await ana.quiz.moveToTrash({ quizId: trashed.quizId });

		expect(
			await failureOf(ana.quiz.publish({ quizId: incomplete.id })),
		).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.INCOMPLETE_QUESTIONS" },
		});
		expect(
			await failureOf(ana.quiz.publish({ quizId: untitled.quizId })),
		).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.TITLE_REQUIRED" },
		});
		expect(
			await failureOf(ana.quiz.publish({ quizId: trashed.quizId })),
		).toMatchObject({ code: "BAD_REQUEST", cause: { code: "QUIZ.IN_TRASH" } });
		expect(
			await failureOf(
				api.callerFor("user-2").quiz.publish({ quizId: untitled.quizId }),
			),
		).toMatchObject({ code: "NOT_FOUND" });
		expect(
			await failureOf(ana.quiz.publish({ quizId: "missing" })),
		).toMatchObject({ code: "NOT_FOUND" });
		expect(await ana.library.list({ section: "drafts" })).toHaveLength(2);
	});

	it("a published quiz refuses to lose its title", async () => {
		const ana = createTestApi().callerFor("user-1");
		const { quizId } = await aCompleteQuiz(ana);
		await ana.quiz.publish({ quizId });

		expect(
			await failureOf(ana.quiz.rename({ quizId, title: "" })),
		).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.TITLE_REQUIRED" },
		});
		expect((await ana.quiz.get({ quizId })).title).toBe("Geografia");
	});

	it("discards the changes of a published quiz", async () => {
		const api = createTestApi();
		const ana = api.callerFor("user-1");
		const { quizId, questionId } = await aCompleteQuiz(ana);
		await ana.quiz.publish({ quizId });
		await ana.quiz.questions.update({
			quizId,
			questionId,
			change: { kind: "text", text: "Mudou" },
		});
		await ana.quiz.questions.add({
			quizId,
			afterQuestionId: questionId,
			type: "trueFalse",
		});

		const editor = await ana.quiz.discardChanges({ quizId });

		expect(editor.questions).toMatchObject([
			{ id: questionId, text: "Qual é a capital do Brasil?" },
		]);
		expect(editor.quiz).toMatchObject({
			hasUnpublishedChanges: false,
			questionCount: 1,
		});
		expect(await ana.quiz.editor({ quizId })).toMatchObject({
			questions: [{ text: "Qual é a capital do Brasil?" }],
		});
		expect(
			await failureOf(api.callerFor("user-2").quiz.discardChanges({ quizId })),
		).toMatchObject({ code: "NOT_FOUND" });
	});

	it("discarding a draft is refused", async () => {
		const ana = createTestApi().callerFor("user-1");
		const draft = await ana.quiz.create({ title: "Geografia" });

		expect(
			await failureOf(ana.quiz.discardChanges({ quizId: draft.id })),
		).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.NOT_PUBLISHED" },
		});
	});

	it("requires a session", async () => {
		const visitor = createTestApi().callerFor(null);

		expect(
			await failureOf(visitor.quiz.publish({ quizId: "x" })),
		).toMatchObject({ code: "UNAUTHORIZED" });
		expect(
			await failureOf(visitor.quiz.discardChanges({ quizId: "x" })),
		).toMatchObject({ code: "UNAUTHORIZED" });
	});
});

describe("quiz router", () => {
	it("creates, fetches and updates a quiz for the signed-in owner", async () => {
		const ana = createTestApi().callerFor("user-1");

		const created = await ana.quiz.create({ title: "Bom de Bíblia" });
		const fetched = await ana.quiz.get({ quizId: created.id });
		const updated = await ana.quiz.updateDetails({
			quizId: created.id,
			title: "Geografia",
			description: null,
			visibility: "unlisted",
			cover: { type: "keep" },
		});

		expect(created).toMatchObject({
			title: "Bom de Bíblia",
			visibility: "private",
			status: "draft",
			questionCount: 1,
		});
		expect(fetched).toEqual(created);
		expect(updated).toMatchObject({
			title: "Geografia",
			visibility: "unlisted",
		});
	});

	it("create returns a quiz with one question", async () => {
		const api = createTestApi();

		const created = await api.callerFor("user-1").quiz.create({});

		expect(created.questionCount).toBe(1);
		expect(api.questions.listOf(created.id)).toHaveLength(1);
	});

	it("editor returns the quiz and its questions", async () => {
		const ana = createTestApi().callerFor("user-1");
		const created = await ana.quiz.create({ title: "Geografia" });

		const editor = await ana.quiz.editor({ quizId: created.id });

		expect(editor.quiz).toMatchObject({ id: created.id, title: "Geografia" });
		expect(editor.questions).toEqual([
			blankQuestion(editor.questions[0]?.id ?? ""),
		]);
	});

	it("editor of another owner's quiz is NOT_FOUND", async () => {
		const api = createTestApi();
		const created = await api.callerFor("user-1").quiz.create({});

		const error = await failureOf(
			api.callerFor("user-2").quiz.editor({ quizId: created.id }),
		);

		expect(error).toMatchObject({ code: "NOT_FOUND" });
	});

	it("editor of a trashed quiz is BAD_REQUEST with domainCode QUIZ.IN_TRASH", async () => {
		const ana = createTestApi().callerFor("user-1");
		const created = await ana.quiz.create({});
		await ana.quiz.moveToTrash({ quizId: created.id });

		const error = await failureOf(ana.quiz.editor({ quizId: created.id }));

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.IN_TRASH" },
		});
	});

	it("renames a quiz and refuses visitors", async () => {
		const api = createTestApi();
		const ana = api.callerFor("user-1");
		const created = await ana.quiz.create({});

		const renamed = await ana.quiz.rename({
			quizId: created.id,
			title: "Capitais",
		});
		const error = await failureOf(
			api.callerFor(null).quiz.rename({ quizId: created.id, title: "X" }),
		);

		expect(renamed.title).toBe("Capitais");
		expect(error).toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("maps another owner's quiz to NOT_FOUND", async () => {
		const api = createTestApi();
		const created = await api
			.callerFor("user-1")
			.quiz.create({ title: "Segredo" });

		const error = await failureOf(
			api.callerFor("user-2").quiz.get({ quizId: created.id }),
		);

		expect(error).toBeInstanceOf(TRPCError);
		expect(error).toMatchObject({
			code: "NOT_FOUND",
			cause: { code: "QUIZ.NOT_FOUND" },
		});
	});

	it("maps editing a trashed quiz to BAD_REQUEST", async () => {
		const ana = createTestApi().callerFor("user-1");
		const created = await ana.quiz.create({ title: "Lixo" });
		await ana.quiz.moveToTrash({ quizId: created.id });

		const error = await failureOf(
			ana.quiz.updateDetails({
				quizId: created.id,
				title: "Novo",
				description: null,
				visibility: "private",
				cover: { type: "keep" },
			}),
		);

		expect(error).toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "QUIZ.IN_TRASH" },
		});
	});

	it("duplicates, trashes, restores and deletes permanently", async () => {
		const ana = createTestApi().callerFor("user-1");
		const original = await ana.quiz.create({ title: "Bom de Bíblia" });

		const copy = await ana.quiz.duplicate({ quizId: original.id });
		await ana.quiz.moveToTrash({ quizId: copy.id });
		const restored = await ana.quiz.restore({ quizId: copy.id });
		await ana.quiz.moveToTrash({ quizId: copy.id });
		await ana.quiz.deletePermanently({ quizId: copy.id });

		expect(copy.title).toBe("Bom de Bíblia (cópia)");
		expect(restored.trashedAt).toBeNull();
		expect(await failureOf(ana.quiz.get({ quizId: copy.id }))).toMatchObject({
			code: "NOT_FOUND",
		});
		expect(await ana.quiz.get({ quizId: original.id })).toEqual(original);
	});

	it("rejects visibilities outside the allowed values at the boundary", async () => {
		const ana = createTestApi().callerFor("user-1");

		const error = await failureOf(
			ana.quiz.create({ title: "Público", visibility: "public" as never }),
		);

		expect(error).toMatchObject({ code: "BAD_REQUEST" });
	});

	it("requires authentication", async () => {
		const visitor = createTestApi().callerFor(null);

		const error = await failureOf(visitor.quiz.create({ title: "Anônimo" }));

		expect(error).toMatchObject({ code: "UNAUTHORIZED" });
	});
});
