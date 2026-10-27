import { describe, expect, it } from "vitest";

import { aQuestion } from "../../quiz/testing/a-question";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { PublicQuizNotFoundError } from "../domain/profile-errors";
import { InMemoryCreatorProfileQuery } from "../testing/in-memory-creator-profile-query";
import { createGetPublicQuiz } from "./get-public-quiz";

function setup() {
	const profiles = new InMemoryCreatorProfileQuery();
	profiles.addCreator({ userId: "ana", name: "Ana", photoKey: null });
	profiles.addPublicQuiz("ana", {
		quizId: "quiz-1",
		title: "Bom de Bíblia",
		coverImageKey: null,
		questionCount: 1,
		games: 3,
		participants: 41,
		description: "Atos",
		questions: [
			aQuestion({
				id: "q1",
				image: {
					key: "media/ana/q1.png",
					placement: "media",
					crop: null,
					altText: null,
				},
			}),
		],
	});
	const getPublicQuiz = createGetPublicQuiz({
		creatorProfiles: profiles,
		storage: new InMemoryObjectStorage(),
	});
	return { profiles, getPublicQuiz };
}

describe("getPublicQuiz (spec 039, RN-33)", () => {
	it("returns the playable version with image URLs", async () => {
		const view = await setup().getPublicQuiz({
			viewerId: "bia",
			ownerId: "ana",
			quizId: "quiz-1",
		});

		expect(view).toMatchObject({
			quizId: "quiz-1",
			title: "Bom de Bíblia",
			description: "Atos",
			owner: { userId: "ana", name: "Ana", photoUrl: null },
			games: 3,
			participants: 41,
			imageUrls: { "media/ana/q1.png": "https://media.test/media/ana/q1.png" },
			ownedByViewer: false,
		});
		expect(view.questions.map((question) => question.id)).toEqual(["q1"]);
	});

	it("a quiz made private, trashed or deleted is PUBLIC_QUIZ_NOT_FOUND", async () => {
		const { profiles, getPublicQuiz } = setup();
		profiles.removePublicQuiz("ana", "quiz-1");

		await expect(
			getPublicQuiz({ viewerId: "bia", ownerId: "ana", quizId: "quiz-1" }),
		).rejects.toThrow(PublicQuizNotFoundError);
		await expect(
			getPublicQuiz({ viewerId: "bia", ownerId: "nobody", quizId: "quiz-1" }),
		).rejects.toThrow(PublicQuizNotFoundError);
	});
});
