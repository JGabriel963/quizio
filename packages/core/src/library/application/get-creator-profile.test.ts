import { describe, expect, it } from "vitest";

import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { ProfileNotFoundError } from "../domain/profile-errors";
import { InMemoryCreatorProfileQuery } from "../testing/in-memory-creator-profile-query";
import { createGetCreatorProfile } from "./get-creator-profile";

function setup() {
	const profiles = new InMemoryCreatorProfileQuery();
	profiles.addCreator({
		userId: "ana",
		name: "Ana",
		photoKey: "profiles/ana/a.webp",
	});
	for (const [quizId, games, participants] of [
		["quiz-1", 3, 41],
		["quiz-2", 1, 5],
	] as const) {
		profiles.addPublicQuiz("ana", {
			quizId,
			title: `Quiz ${quizId}`,
			coverImageKey: quizId === "quiz-1" ? "media/ana/c.png" : null,
			questionCount: 15,
			games,
			participants,
			description: "",
			questions: [],
			themeId: "standard",
		});
	}
	const getProfile = createGetCreatorProfile({
		creatorProfiles: profiles,
		storage: new InMemoryObjectStorage(),
	});
	return { profiles, getProfile };
}

describe("getCreatorProfile (spec 039)", () => {
	it("lists the public quizzes with totals of games and participants", async () => {
		const profile = await setup().getProfile({
			viewerId: "bia",
			userId: "ana",
		});

		expect(profile.creator).toEqual({
			userId: "ana",
			name: "Ana",
			photoUrl: "https://media.test/profiles/ana/a.webp",
		});
		expect(profile.totals).toEqual({ quizzes: 2, games: 4, participants: 46 });
		expect(profile.quizzes[0]).toEqual({
			quizId: "quiz-1",
			title: "Quiz quiz-1",
			coverUrl: "https://media.test/media/ana/c.png",
			questionCount: 15,
			participants: 41,
		});
	});

	it("an unknown user is PROFILE_NOT_FOUND", async () => {
		await expect(
			setup().getProfile({ viewerId: "bia", userId: "nobody" }),
		).rejects.toThrow(ProfileNotFoundError);
	});

	it("tells the owner from a visitor", async () => {
		const { getProfile } = setup();

		expect((await getProfile({ viewerId: "ana", userId: "ana" })).isOwner).toBe(
			true,
		);
		expect((await getProfile({ viewerId: "bia", userId: "ana" })).isOwner).toBe(
			false,
		);
	});
});
