import { describe, expect, it } from "vitest";

import { groupsTestDeps } from "../testing/groups-test-deps";
import { createDeleteGroupPost } from "./delete-group-post";
import { createListGroupFeed } from "./list-group-feed";
import { createShareQuizzesInGroup } from "./share-quizzes-in-group";
import { createUnshareQuiz } from "./unshare-quiz";

async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno", "carla"]);
	t.sharedQuizReads.addQuiz({
		id: "capitais",
		ownerId: "bruno",
		title: "Capitais",
		coverImageKey: "media/bruno/capa.png",
		visibility: "unlisted",
		games: 2,
	});
	t.sharedQuizReads.addQuiz({ id: "rios", ownerId: "ana", title: "Rios" });
	t.sharedQuizReads.addQuiz({ id: "mapas", ownerId: "ana", title: "Mapas" });
	const share = createShareQuizzesInGroup(t.deps);
	const feed = async (userId = "carla") =>
		(await createListGroupFeed(t.deps)({ userId, groupId })).posts;
	return { ...t, groupId, share, feed };
}

describe("posts of shared quizzes (spec 037)", () => {
	it("a quizShare post shows the quiz card while its share is alive (RN-09)", async () => {
		const t = await setup();
		await t.share({
			userId: "bruno",
			groupId: t.groupId,
			quizIds: ["capitais"],
			message: "Para a revisão",
		});

		const [post] = await t.feed();

		expect(post).toMatchObject({
			headline: "quiz",
			message: "Para a revisão",
			canDelete: false,
			quiz: {
				quizId: "capitais",
				title: "Capitais",
				coverUrl: "https://media.test/media/bruno/capa.png",
				questionCount: 0,
				visibility: "unlisted",
				owner: { userId: "bruno", name: "Bruno" },
				sharedAt: t.clock.now(),
				games: 2,
				ownedByViewer: false,
				canUnshare: false,
			},
		});
		const [ownView] = await t.feed("bruno");
		expect(ownView?.quiz).toMatchObject({
			ownedByViewer: true,
			canUnshare: true,
		});
		const [adminView] = await t.feed("ana");
		expect(adminView?.quiz?.canUnshare).toBe(true);
	});

	it("loses the card after unshare, a trashed quiz or a new share of the same quiz (RN-13, RN-23)", async () => {
		const t = await setup();
		await t.share({
			userId: "bruno",
			groupId: t.groupId,
			quizIds: ["capitais"],
		});

		t.sharedQuizReads.updateQuiz("capitais", { trashed: true });
		expect(await t.feed()).toMatchObject([{ headline: "file", quiz: null }]);
		t.sharedQuizReads.updateQuiz("capitais", { trashed: false });
		expect(await t.feed()).toMatchObject([{ headline: "quiz" }]);

		await createUnshareQuiz(t.deps)({
			userId: "bruno",
			groupId: t.groupId,
			quizId: "capitais",
		});
		t.clock.advanceBy(60_000);
		await t.share({
			userId: "bruno",
			groupId: t.groupId,
			quizIds: ["capitais"],
		});

		const [fresh, old] = await t.feed();
		expect(fresh).toMatchObject({ headline: "quiz" });
		expect(old).toMatchObject({ headline: "file", quiz: null });
	});

	it("several quizzes are compartilhou múltiplos kahoots without a card", async () => {
		const t = await setup();
		await t.share({
			userId: "ana",
			groupId: t.groupId,
			quizIds: ["rios", "mapas"],
		});

		expect(await t.feed()).toMatchObject([{ headline: "quizzes", quiz: null }]);
	});

	it("deleting a quizzesShare post keeps the shares (RN-12)", async () => {
		const t = await setup();
		const { postId } = await t.share({
			userId: "ana",
			groupId: t.groupId,
			quizIds: ["rios", "mapas"],
		});

		await createDeleteGroupPost(t.deps)({
			userId: "ana",
			groupId: t.groupId,
			postId,
		});

		expect(await t.feed()).toEqual([]);
		expect((await t.store.sharedQuizIdsOf(t.groupId)).sort()).toEqual([
			"mapas",
			"rios",
		]);
	});
});
