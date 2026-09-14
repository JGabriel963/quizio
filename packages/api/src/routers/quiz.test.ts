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
			questionCount: 0,
		});
		expect(fetched).toEqual(created);
		expect(updated).toMatchObject({
			title: "Geografia",
			visibility: "unlisted",
		});
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
