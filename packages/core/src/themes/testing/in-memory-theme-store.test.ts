import { describe, expect, it } from "vitest";

import { aQuiz } from "../../quiz/testing/a-quiz";
import { InMemoryQuizRepository } from "../../quiz/testing/in-memory-quiz-repository";
import { aCustomTheme } from "./a-custom-theme";
import { InMemoryThemeStore } from "./in-memory-theme-store";

const AT = new Date("2026-10-28T12:00:00.000Z");

describe("InMemoryThemeStore (spec 043)", () => {
	it("createTakingUploads refuses when an upload is missing and writes nothing", async () => {
		const store = new InMemoryThemeStore();
		await store.addThemeUpload({
			key: "themes/owner-1/a.png",
			ownerId: "owner-1",
			createdAt: AT,
		});

		const result = await store.createTakingUploads(aCustomTheme(), [
			"themes/owner-1/a.png",
			"themes/owner-1/b.png",
		]);

		expect(result).toBe("uploadMissing");
		expect(await store.findById("theme-1")).toBeNull();
		expect(store.pendingUploadKeys()).toEqual(["themes/owner-1/a.png"]);
	});

	it("createTakingUploads takes the owner's uploads with the theme", async () => {
		const store = new InMemoryThemeStore();
		await store.addThemeUpload({
			key: "themes/owner-1/a.png",
			ownerId: "owner-1",
			createdAt: AT,
		});

		const result = await store.createTakingUploads(aCustomTheme(), [
			"themes/owner-1/a.png",
		]);

		expect(result).toBe("ok");
		expect(await store.findById("theme-1")).not.toBeNull();
		expect(store.pendingUploadKeys()).toEqual([]);
	});

	it("someone else's upload is missing", async () => {
		const store = new InMemoryThemeStore();
		await store.addThemeUpload({
			key: "themes/owner-2/a.png",
			ownerId: "owner-2",
			createdAt: AT,
		});

		expect(
			await store.createTakingUploads(aCustomTheme(), ["themes/owner-2/a.png"]),
		).toBe("uploadMissing");
	});

	it("listByOwner counts the quizzes using each theme, newest first", async () => {
		const quizzes = new InMemoryQuizRepository();
		const store = new InMemoryThemeStore(quizzes);
		await store.createTakingUploads(aCustomTheme({ id: "old" }), []);
		await store.createTakingUploads(
			aCustomTheme({ id: "new", createdAt: new Date(AT.getTime() + 1000) }),
			[],
		);
		await store.createTakingUploads(
			aCustomTheme({ id: "other", ownerId: "owner-2" }),
			[],
		);
		await quizzes.save(
			aQuiz({ id: "q1", ownerId: "owner-1", customThemeId: "old" }),
		);
		await quizzes.save(
			aQuiz({ id: "q2", ownerId: "owner-1", customThemeId: "old" }),
		);

		const listed = await store.listByOwner("owner-1");

		expect(listed.map((theme) => [theme.id, theme.quizCount])).toEqual([
			["new", 0],
			["old", 2],
		]);
	});

	it("deleting a theme sets its quizzes back to standard, as the foreign key does", async () => {
		const quizzes = new InMemoryQuizRepository();
		const store = new InMemoryThemeStore(quizzes);
		await store.createTakingUploads(aCustomTheme(), []);
		await quizzes.save(aQuiz({ id: "q1", customThemeId: "theme-1" }));

		await store.delete("theme-1");

		expect((await quizzes.findById("q1"))?.customThemeId).toBeNull();
		expect(await store.findById("theme-1")).toBeNull();
	});

	it("findOwned answers only the owner", async () => {
		const store = new InMemoryThemeStore();
		await store.createTakingUploads(aCustomTheme(), []);

		expect(await store.findOwned("owner-1", "theme-1")).toMatchObject({
			id: "theme-1",
		});
		expect(await store.findOwned("owner-2", "theme-1")).toBeNull();
	});

	it("takes the expired uploads once", async () => {
		const store = new InMemoryThemeStore();
		await store.addThemeUpload({
			key: "old",
			ownerId: "owner-1",
			createdAt: AT,
		});
		await store.addThemeUpload({
			key: "new",
			ownerId: "owner-1",
			createdAt: new Date(AT.getTime() + 10_000),
		});
		const before = new Date(AT.getTime() + 1);

		expect(await store.takeExpiredThemeUploads(before, 20)).toEqual(["old"]);
		expect(await store.takeExpiredThemeUploads(before, 20)).toEqual([]);
	});
});
