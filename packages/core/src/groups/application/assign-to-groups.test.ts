import { describe, expect, it } from "vitest";

import {
	AlreadyAssignedToGroupError,
	AssignmentNotShareableError,
	AssignNotAllowedError,
} from "../domain/group-errors";
import { groupsTestDeps } from "../testing/groups-test-deps";
import { createAssignToGroups } from "./assign-to-groups";
import { createListAssignableGroups } from "./list-assignable-groups";

const HOUR = 60 * 60 * 1000;

/**
 * Ana administers "Turma 7A" and "Coral" and is a member of "Jovens" (no
 * assigning) and "Célula" (assigning allowed); she made an assignment in the
 * library (spec 029).
 */
async function setup() {
	const t = groupsTestDeps();
	const turma = await t.aGroupOf("ana", [], "Turma 7A");
	const coral = await t.aGroupOf("ana", [], "Coral");
	const jovens = await t.aGroupOf("bruno", ["ana"], "Jovens");
	const celula = await t.aGroupOf("carla", ["ana"], "Célula");
	await t.store.savePermission(celula, "membersCanAssign", true);
	t.assignments.put({
		gameId: "game-1",
		ownerId: "ana",
		ownerName: "Ana",
		name: "Capitais",
		questionCount: 5,
		coverImageKey: null,
		expiresAt: new Date(t.clock.now().getTime() + 72 * HOUR),
		endedAt: null,
	});
	return { ...t, turma, coral, jovens, celula };
}

describe("listAssignableGroups (spec 038, RN-26)", () => {
	it("lists only groups where the user may assign, marking those that have it", async () => {
		const t = await setup();
		await createAssignToGroups(t.deps)({
			userId: "ana",
			gameId: "game-1",
			groupIds: [t.coral],
		});

		const { groups } = await createListAssignableGroups(t.deps)({
			userId: "ana",
			gameId: "game-1",
		});

		expect(
			groups
				.map((group) => [group.name, group.alreadyAssigned])
				.sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
		).toEqual([
			["Célula", false],
			["Coral", true],
			["Turma 7A", false],
		]);
	});
});

describe("assignToGroups (spec 038, RN-25 to RN-28)", () => {
	it("posts to several groups without message", async () => {
		const t = await setup();

		const result = await createAssignToGroups(t.deps)({
			userId: "ana",
			gameId: "game-1",
			groupIds: [t.turma, t.celula],
		});

		expect(result).toEqual({ assigned: 2 });
		for (const groupId of [t.turma, t.celula]) {
			const posts = await t.store.listPosts(groupId, "ana");
			expect(posts).toEqual([
				expect.objectContaining({
					authorId: "ana",
					gameId: "game-1",
					message: null,
				}),
			]);
		}
	});

	it("refuses an assignment already in a group, ended, or of somebody else, writing nothing", async () => {
		const t = await setup();
		const assign = createAssignToGroups(t.deps);
		await assign({ userId: "ana", gameId: "game-1", groupIds: [t.coral] });

		await expect(
			assign({ userId: "ana", gameId: "game-1", groupIds: [t.turma, t.coral] }),
		).rejects.toThrow(AlreadyAssignedToGroupError);
		expect(await t.store.listPosts(t.turma, "ana")).toEqual([]);

		await expect(
			assign({ userId: "bruno", gameId: "game-1", groupIds: [t.jovens] }),
		).rejects.toThrow(AssignmentNotShareableError);
		t.assignments.end("game-1", t.clock.now());
		await expect(
			assign({ userId: "ana", gameId: "game-1", groupIds: [t.turma] }),
		).rejects.toThrow(AssignmentNotShareableError);
		await expect(
			createListAssignableGroups(t.deps)({ userId: "ana", gameId: "game-1" }),
		).rejects.toThrow(AssignmentNotShareableError);
	});

	it("refuses a group where the user may not assign", async () => {
		const t = await setup();

		await expect(
			createAssignToGroups(t.deps)({
				userId: "ana",
				gameId: "game-1",
				groupIds: [t.turma, t.jovens],
			}),
		).rejects.toThrow(AssignNotAllowedError);
		expect(await t.store.listPosts(t.turma, "ana")).toEqual([]);
	});
});
