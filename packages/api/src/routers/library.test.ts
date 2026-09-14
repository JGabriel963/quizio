import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

const failureOf = (promise: Promise<unknown>) =>
	promise.then(
		() => {
			throw new Error("Expected the call to fail");
		},
		(error: unknown) => error,
	);

describe("library router", () => {
	it("lists a section for the signed-in owner only", async () => {
		const api = createTestApi();
		const ana = api.callerFor("user-1");
		const mine = await ana.quiz.create({ title: "Bom de Bíblia" });
		await api.callerFor("user-2").quiz.create({ title: "Do Beto" });

		const items = await ana.library.list({ section: "recent" });

		expect(items.map((item) => item.id)).toEqual([mine.id]);
		expect(items[0]).toMatchObject({
			title: "Bom de Bíblia",
			questionCount: 0,
			coverImageUrl: null,
		});
	});

	it("passes the search through the library use case, ignoring accents", async () => {
		const ana = createTestApi().callerFor("user-1");
		const biblia = await ana.quiz.create({ title: "Bom de Bíblia" });
		await ana.quiz.create({ title: "Geografia" });

		const items = await ana.library.list({
			section: "recent",
			search: "BIBLIA",
		});

		expect(items.map((item) => item.id)).toEqual([biblia.id]);
	});

	it("lists trashed quizzes only in the trash", async () => {
		const ana = createTestApi().callerFor("user-1");
		const quiz = await ana.quiz.create({ title: "Lixo" });
		await ana.quiz.moveToTrash({ quizId: quiz.id });

		expect(await ana.library.list({ section: "recent" })).toEqual([]);
		expect(
			(await ana.library.list({ section: "trash" })).map((item) => item.id),
		).toEqual([quiz.id]);
	});

	it("rejects unknown sections at the boundary", async () => {
		const ana = createTestApi().callerFor("user-1");

		const error = await failureOf(
			ana.library.list({ section: "favorites" as never }),
		);

		expect(error).toMatchObject({ code: "BAD_REQUEST" });
	});

	it("requires authentication", async () => {
		const visitor = createTestApi().callerFor(null);

		const error = await failureOf(visitor.library.list({ section: "recent" }));

		expect(error).toMatchObject({ code: "UNAUTHORIZED" });
	});
});
