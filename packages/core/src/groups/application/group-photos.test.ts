import { describe, expect, it } from "vitest";

import { groupsTestDeps } from "../testing/groups-test-deps";
import { createAssignInGroup } from "./assign-in-group";
import { createCreateGroupPost } from "./create-group-post";
import { createGetGroup } from "./get-group";
import { createGetSharedQuiz } from "./get-shared-quiz";
import { createListGroupAssignments } from "./list-group-assignments";
import { createListGroupFeed } from "./list-group-feed";
import { createListGroupMembers } from "./list-group-members";
import { createListSharedQuizzes } from "./list-shared-quizzes";
import { createShareQuizzesInGroup } from "./share-quizzes-in-group";

const BRUNO_PHOTO = "https://media.test/profiles/bruno/b.webp";

async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno"]);
	await t.deps.profilePhotos.save("bruno", "profiles/bruno/b.webp");
	return { ...t, groupId };
}

describe("people's photos in the group (spec 039, RN-06)", () => {
	it("group header and members carry photoUrl", async () => {
		const t = await setup();

		const view = await createGetGroup(t.deps)({
			userId: "ana",
			groupId: t.groupId,
		});
		const members = await createListGroupMembers(t.deps)({
			userId: "ana",
			groupId: t.groupId,
		});

		expect(view.memberPreview).toEqual([
			{ userId: "ana", name: "Ana", photoUrl: null },
			{ userId: "bruno", name: "Bruno", photoUrl: BRUNO_PHOTO },
		]);
		expect(members.items.map((member) => member.photoUrl)).toEqual([
			null,
			BRUNO_PHOTO,
		]);
	});

	it("feed authors, shared quiz owners and assigners carry photoUrl", async () => {
		const t = await setup();
		await createCreateGroupPost(t.deps)({
			userId: "bruno",
			groupId: t.groupId,
			message: "Oi",
		});
		t.sharedQuizReads.addQuiz({
			id: "capitais",
			ownerId: "bruno",
			title: "Capitais",
		});
		await createShareQuizzesInGroup(t.deps)({
			userId: "bruno",
			groupId: t.groupId,
			quizIds: ["capitais"],
		});
		await t.deps.profilePhotos.save("ana", "profiles/ana/a.webp");
		await createAssignInGroup(t.deps)({
			userId: "ana",
			groupId: t.groupId,
			quizId: "quiz-ana",
			deadline: new Date("2026-10-29T12:00:00.000Z"),
			options: {
				gameCharacters: false,
				questionTimer: true,
				randomizeAnswers: false,
			},
		});

		const { posts } = await createListGroupFeed(t.deps)({
			userId: "ana",
			groupId: t.groupId,
		});
		const shared = await createListSharedQuizzes(t.deps)({
			userId: "ana",
			groupId: t.groupId,
			sort: "recent",
		});
		const sharedQuiz = await createGetSharedQuiz(t.deps)({
			userId: "ana",
			groupId: t.groupId,
			quizId: "capitais",
		});
		const assignments = await createListGroupAssignments(t.deps)({
			userId: "ana",
			groupId: t.groupId,
			sort: "recent",
		});

		expect(
			posts.map((post) => [post.author.userId, post.author.photoUrl]),
		).toEqual([
			["ana", "https://media.test/profiles/ana/a.webp"],
			["bruno", BRUNO_PHOTO],
			["bruno", BRUNO_PHOTO],
		]);
		expect(shared.items[0]?.owner.photoUrl).toBe(BRUNO_PHOTO);
		expect(sharedQuiz.owner.photoUrl).toBe(BRUNO_PHOTO);
		expect(sharedQuiz.sharedBy.photoUrl).toBe(BRUNO_PHOTO);
		expect(assignments.items[0]?.assignedBy.photoUrl).toBe(
			"https://media.test/profiles/ana/a.webp",
		);
	});
});
