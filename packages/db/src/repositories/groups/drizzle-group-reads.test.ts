import { adminOf, aGroup } from "@quizio/core/groups/testing/a-group";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { groupTable } from "../../schema/groups";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGroupMemberRepository } from "./drizzle-group-member-repository";
import { createDrizzleGroupReads } from "./drizzle-group-reads";
import { createDrizzleGroupRepository } from "./drizzle-group-repository";
import { createDrizzleGroupVisitRepository } from "./drizzle-group-visit-repository";

const at = (minute: number) =>
	new Date(`2026-10-26T12:${String(minute).padStart(2, "0")}:00.000Z`);

describe("DrizzleGroupReads (spec 034)", () => {
	let testDb: TestDatabase;
	let groups: ReturnType<typeof createDrizzleGroupRepository>;
	let members: ReturnType<typeof createDrizzleGroupMemberRepository>;
	let visits: ReturnType<typeof createDrizzleGroupVisitRepository>;
	let reads: ReturnType<typeof createDrizzleGroupReads>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
		]);
		groups = createDrizzleGroupRepository(testDb.db);
		members = createDrizzleGroupMemberRepository(testDb.db);
		visits = createDrizzleGroupVisitRepository(testDb.db);
		reads = createDrizzleGroupReads(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(groupTable);
	});

	async function create(id: string, adminId: string, minute: number) {
		const group = aGroup({
			id,
			name: id,
			adminId,
			inviteCode: `code-${id}`,
			createdAt: at(minute),
		});
		await groups.create(group, adminOf(group));
		return group;
	}
	const join = (groupId: string, userId: string, minute: number) =>
		members.addWithInvite({
			groupId,
			inviteCode: `code-${groupId}`,
			userId,
			joinedAt: at(minute),
		});

	it("lists a user's groups with role, member count and since", async () => {
		await create("Coral", "ana", 1);
		await create("Jovens", "bruno", 2);
		await join("Jovens", "ana", 3);
		await join("Coral", "bruno", 4);

		const list = await reads.listForUser("ana");

		expect(list.sort((a, b) => a.id.localeCompare(b.id))).toEqual([
			{
				id: "Coral",
				name: "Coral",
				role: "admin",
				memberCount: 2,
				since: at(1),
			},
			{
				id: "Jovens",
				name: "Jovens",
				role: "member",
				memberCount: 2,
				since: at(3),
			},
		]);
		expect(await reads.listForUser("nobody")).toEqual([]);
	});

	it("recentForUser keeps the 5 latest of groups the user belongs to", async () => {
		for (let minute = 1; minute <= 6; minute++) {
			await create(`G${minute}`, "ana", minute);
			await visits.touch("ana", `G${minute}`, at(10 + minute));
		}
		await create("Alheio", "bruno", 7);
		await visits.touch("ana", "Alheio", at(30));

		expect(await reads.recentForUser("ana", 5)).toEqual(
			["G6", "G5", "G4", "G3", "G2"].map((id) => ({ id, name: id })),
		);
	});

	it("members carry the account's name and email", async () => {
		await create("Coral", "ana", 1);
		await join("Coral", "bruno", 2);

		const list = await reads.members("Coral");

		expect(list.sort((a, b) => a.userId.localeCompare(b.userId))).toEqual([
			{
				userId: "ana",
				name: "Ana",
				email: "ana@quizio.test",
				role: "admin",
				joinedAt: at(1),
			},
			{
				userId: "bruno",
				name: "Bruno",
				email: "bruno@quizio.test",
				role: "member",
				joinedAt: at(2),
			},
		]);
	});
});
