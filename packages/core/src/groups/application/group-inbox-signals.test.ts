import { describe, expect, it } from "vitest";

import { groupsTestDeps } from "../testing/groups-test-deps";
import { createAssignInGroup } from "./assign-in-group";
import { createAssignToGroups } from "./assign-to-groups";
import { createCreateGroupPost } from "./create-group-post";
import { createDeleteGroup } from "./delete-group";
import { createLeaveGroup } from "./leave-group";
import { createRemoveGroupMember } from "./remove-group-member";
import { createShareQuizzesInGroup } from "./share-quizzes-in-group";

const deadline = new Date("2026-10-29T12:00:00.000Z");
const options = {
	gameCharacters: false,
	questionTimer: true,
	randomizeAnswers: false,
};

async function setup() {
	const t = groupsTestDeps();
	const groupId = await t.aGroupOf("ana", ["bruno", "carla"], "GRUPO 1");
	t.inbox.clear();
	return { ...t, groupId };
}

const sorted = (ids: readonly string[] | undefined) => [...(ids ?? [])].sort();

describe("the groups tell the inbox (spec 040)", () => {
	it("a message post signals every member but its author (RN-02)", async () => {
		const t = await setup();

		await createCreateGroupPost(t.deps)({
			userId: "bruno",
			groupId: t.groupId,
			message: "Prova na sexta",
		});

		expect(t.inbox.signals.map(sorted)).toEqual([["ana", "carla"]]);
	});

	it("sharing and assigning signal the other members (RN-03, RN-04)", async () => {
		const t = await setup();
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
		await createAssignInGroup(t.deps)({
			userId: "ana",
			groupId: t.groupId,
			quizId: "quiz-ana",
			deadline,
			options,
		});

		expect(t.inbox.signals.map(sorted)).toEqual([
			["ana", "carla"],
			["bruno", "carla"],
		]);
	});

	it("assigning to several groups signals each group", async () => {
		const t = await setup();
		const other = await t.aGroupOf("ana", ["carla"], "GRUPO 2");
		const { gameId } = await createAssignInGroup(t.deps)({
			userId: "ana",
			groupId: t.groupId,
			quizId: "quiz-ana",
			deadline,
			options,
		});
		t.inbox.clear();
		const third = await t.aGroupOf("ana", ["bruno"], "GRUPO 3");
		t.inbox.clear();

		await createAssignToGroups(t.deps)({
			userId: "ana",
			gameId,
			groupIds: [other, third],
		});

		expect(t.inbox.signals.map(sorted)).toEqual([["carla"], ["bruno"]]);
	});

	it("accepting the invite signals the admin (RN-05)", async () => {
		const t = groupsTestDeps();
		await t.aGroupOf("ana", ["bruno"]);

		expect(t.inbox.signals).toEqual([["ana"]]);
	});

	it("removing a member leaves a removed notice for them (RN-06)", async () => {
		const t = await setup();

		await createRemoveGroupMember(t.deps)({
			userId: "ana",
			groupId: t.groupId,
			memberId: "carla",
		});

		expect(t.inbox.notices).toEqual([
			{ kind: "removed", userIds: ["carla"], groupName: "GRUPO 1" },
		]);
	});

	it("deleting the group leaves a groupDeleted notice for every member but the admin, before the rows go (RN-06)", async () => {
		const t = await setup();

		await createDeleteGroup(t.deps)({ userId: "ana", groupId: t.groupId });

		expect(t.inbox.notices).toEqual([
			{
				kind: "groupDeleted",
				userIds: ["bruno", "carla"],
				groupName: "GRUPO 1",
			},
		]);
	});

	it("leaving the group signals nobody (RN-06)", async () => {
		const t = await setup();

		await createLeaveGroup(t.deps)({ userId: "carla", groupId: t.groupId });

		expect(t.inbox.signals).toEqual([]);
		expect(t.inbox.notices).toEqual([]);
	});

	it("a failing inbox does not undo the write", async () => {
		const t = await setup();
		t.inbox.failing = true;

		const { postId } = await createCreateGroupPost(t.deps)({
			userId: "bruno",
			groupId: t.groupId,
			message: "Oi",
		});
		await createDeleteGroup(t.deps)({ userId: "ana", groupId: t.groupId });

		expect(postId).toBeTruthy();
		expect(await t.store.findById(t.groupId)).toBeNull();
	});
});
