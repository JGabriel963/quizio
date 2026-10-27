import { aGame } from "@quizio/core/game/testing/a-game";
import { aPublishedQuiz, aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

function setup() {
	const api = createTestApi();
	api.accounts.add({ id: "ana", name: "Ana", email: "ana@quizio.test" });
	api.accounts.add({ id: "bia", name: "Bia", email: "bia@gmail.test" });
	api.credentials.setPassword("ana", "segredo-123");
	return api;
}

describe("account router (spec 039)", () => {
	it("get returns the account of the session", async () => {
		const api = setup();

		expect(await api.callerFor("ana").account.get()).toEqual({
			userId: "ana",
			name: "Ana",
			email: "ana@quizio.test",
			photoUrl: null,
			hasPassword: true,
		});
		await expect(api.callerFor(null).account.get()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	it("photo upload, set and remove", async () => {
		const api = setup();
		const ana = api.callerFor("ana");

		const upload = await ana.account.requestPhotoUpload({
			contentType: "image/webp",
			sizeBytes: 30_000,
		});
		api.storage.simulateUpload(upload.key);
		const set = await ana.account.setPhoto({ key: upload.key });

		expect(upload.key).toMatch(/^profiles\/ana\//);
		expect(set.photoUrl).toBe(`https://media.test/${upload.key}`);
		expect((await ana.account.get()).photoUrl).toBe(set.photoUrl);
		await expect(
			ana.account.setPhoto({ key: "profiles/bia/x.webp" }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "IDENTITY.INVALID_PHOTO" },
		});

		expect(await ana.account.removePhoto()).toEqual({ photoUrl: null });
		expect(api.storage.keys()).toEqual([]);
	});

	it("profile of an unknown user is NOT_FOUND", async () => {
		const api = setup();

		await expect(
			api.callerFor("ana").account.profile({ userId: "nobody" }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("a visitor reads the profile and a public quiz", async () => {
		const api = setup();
		await api.quizzes.save(
			aPublishedQuiz({ id: "quiz-1", ownerId: "ana", visibility: "public" }),
		);
		api.creatorProfiles.addCreator({
			userId: "ana",
			name: "Ana",
			photoKey: null,
		});
		api.creatorProfiles.addPublicQuiz("ana", {
			quizId: "quiz-1",
			title: "Capitais",
			coverImageKey: null,
			questionCount: 1,
			games: 0,
			participants: 0,
			description: "",
			questions: [],
			themeId: "standard",
		});
		const bia = api.callerFor("bia");

		const profile = await bia.account.profile({ userId: "ana" });
		const page = await bia.account.publicQuiz({
			userId: "ana",
			quizId: "quiz-1",
		});

		expect(profile).toMatchObject({
			isOwner: false,
			totals: { quizzes: 1 },
		});
		expect(page).toMatchObject({ quizId: "quiz-1", ownedByViewer: false });
	});

	it("setVisibility makes an owned quiz public", async () => {
		const api = setup();
		await api.quizzes.save(aQuiz({ id: "quiz-1", ownerId: "ana" }));

		const view = await api
			.callerFor("ana")
			.quiz.setVisibility({ quizId: "quiz-1", visibility: "public" });

		expect(view.visibility).toBe("public");
	});

	it("delete with the right password ends the games and removes the account and its files", async () => {
		const api = setup();
		await api.quizzes.save(aPublishedQuiz({ id: "quiz-1", ownerId: "ana" }));
		await api.games.create(
			aGame({ id: "game-1", ownerId: "ana", quizId: "quiz-1" }),
		);
		api.storage.simulateUpload("media/ana/cover.png");
		api.storage.simulateUpload("profiles/ana/me.webp");

		await api.callerFor("ana").account.delete({
			reason: "notUsing",
			feedback: "Obrigada",
			confirmation: { kind: "password", password: "segredo-123" },
		});

		expect(await api.accounts.find("ana")).toBeNull();
		expect((await api.games.findById("game-1"))?.endedAt).not.toBeNull();
		expect(api.storage.keys()).toEqual([]);
		expect(api.deletionFeedback.entries).toEqual([
			expect.objectContaining({ reason: "notUsing", feedback: "Obrigada" }),
		]);
	});

	it("delete with a wrong password keeps the account", async () => {
		const api = setup();

		await expect(
			api.callerFor("ana").account.delete({
				reason: "other",
				confirmation: { kind: "password", password: "errada" },
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "IDENTITY.WRONG_PASSWORD" },
		});
		expect(await api.accounts.find("ana")).not.toBeNull();
	});
});
