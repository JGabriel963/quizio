import { describe, expect, it } from "vitest";

import { groupsTestDeps } from "../testing/groups-test-deps";
import { createAssignInGroup } from "./assign-in-group";
import { createDeleteGroup } from "./delete-group";
import { createGetGroup } from "./get-group";

const deadline = new Date("2026-10-29T12:00:00.000Z");
const options = {
	gameCharacters: false,
	questionTimer: true,
	randomizeAnswers: false,
};

describe("the group's page and assignments (spec 038)", () => {
	it("abilities.assign follows the switch (RN-01)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana", ["bruno"]);
		const get = createGetGroup(t.deps);

		expect((await get({ userId: "ana", groupId })).abilities.assign).toBe(true);
		expect((await get({ userId: "bruno", groupId })).abilities.assign).toBe(
			false,
		);
		await t.store.savePermission(groupId, "membersCanAssign", true);
		expect((await get({ userId: "bruno", groupId })).abilities.assign).toBe(
			true,
		);
	});

	it("the setup marks Atribuir and Criar publicação after an assignment (RN-29)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");

		await createAssignInGroup(t.deps)({
			userId: "ana",
			groupId,
			quizId: "quiz-ana",
			deadline,
			options,
		});

		expect(
			(await createGetGroup(t.deps)({ userId: "ana", groupId })).setup,
		).toEqual({ invited: false, assigned: true, posted: true });
	});

	it("deleting the group keeps its assignments (RN-30)", async () => {
		const t = groupsTestDeps();
		const groupId = await t.aGroupOf("ana");
		const { gameId } = await createAssignInGroup(t.deps)({
			userId: "ana",
			groupId,
			quizId: "quiz-ana",
			deadline,
			options,
		});

		await createDeleteGroup(t.deps)({ userId: "ana", groupId });

		expect(await t.assignments.findAssignments([gameId])).toHaveLength(1);
		expect(await t.store.listPosts(groupId, "ana")).toEqual([]);
	});
});
