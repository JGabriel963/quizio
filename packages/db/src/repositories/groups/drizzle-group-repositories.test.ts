import { DEFAULT_GROUP_PERMISSIONS } from "@quizio/core/groups/domain/group-permissions";
import { adminOf, aGroup } from "@quizio/core/groups/testing/a-group";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { groupMember, groupTable, groupVisit } from "../../schema/groups";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGroupMemberRepository } from "./drizzle-group-member-repository";
import { createDrizzleGroupRepository } from "./drizzle-group-repository";
import { createDrizzleGroupVisitRepository } from "./drizzle-group-visit-repository";

const at = (minute: number) =>
	new Date(`2026-10-26T12:${String(minute).padStart(2, "0")}:00.000Z`);

describe("Drizzle groups repositories (spec 034)", () => {
	let testDb: TestDatabase;
	let groups: ReturnType<typeof createDrizzleGroupRepository>;
	let members: ReturnType<typeof createDrizzleGroupMemberRepository>;
	let visits: ReturnType<typeof createDrizzleGroupVisitRepository>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
		]);
		groups = createDrizzleGroupRepository(testDb.db);
		members = createDrizzleGroupMemberRepository(testDb.db);
		visits = createDrizzleGroupVisitRepository(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(groupTable);
	});

	const create = async (overrides: Parameters<typeof aGroup>[0] = {}) => {
		const group = aGroup({ adminId: "ana", ...overrides });
		await groups.create(group, adminOf(group));
		return group;
	};
	const join = (inviteCode: string, groupId = "group-1") =>
		members.addWithInvite({
			groupId,
			inviteCode,
			userId: "bruno",
			joinedAt: at(5),
		});

	it("creates a group with its admin's membership in one transaction", async () => {
		const group = await create();

		expect(await groups.findById(group.id)).toEqual(group);
		expect(await groups.findByInviteCode(group.inviteCode)).toEqual(group);
		expect(await members.find(group.id, "ana")).toEqual(adminOf(group));
	});

	it("invite codes are unique", async () => {
		await create({ id: "g1", inviteCode: "same" });

		await expect(create({ id: "g2", inviteCode: "same" })).rejects.toThrow();
		expect(await groups.findById("g2")).toBeNull();
	});

	it("saveInviteCode and saveSetupDismissed change only their column", async () => {
		const group = await create();

		await groups.saveInviteCode(group.id, "invite-2");
		await groups.saveSetupDismissed(group.id, at(9));

		expect(await groups.findById(group.id)).toEqual({
			...group,
			inviteCode: "invite-2",
			setupDismissedAt: at(9),
		});
		expect(await groups.findByInviteCode("invite-1")).toBeNull();
	});

	it("deleting a group cascades to members and visits", async () => {
		const group = await create();
		await join(group.inviteCode);
		await visits.touch("bruno", group.id, at(6));

		await groups.delete(group.id);

		expect(await testDb.db.select().from(groupMember)).toEqual([]);
		expect(await testDb.db.select().from(groupVisit)).toEqual([]);
	});

	it("addWithInvite: added, alreadyMember, and invalid after a reset", async () => {
		const group = await create();

		expect(await join("invite-1")).toBe("added");
		expect(await members.find(group.id, "bruno")).toEqual({
			groupId: group.id,
			userId: "bruno",
			role: "member",
			joinedAt: at(5),
		});
		expect(await join("invite-1")).toBe("alreadyMember");
		await groups.saveInviteCode(group.id, "invite-2");
		await members.remove(group.id, "bruno");
		expect(await join("invite-1")).toBe("invalid");
		expect(await join("invite-2", "nope")).toBe("invalid");
	});

	it("two accepts at once leave one row", async () => {
		await create();

		const results = await Promise.all([join("invite-1"), join("invite-1")]);

		expect([...results].sort()).toEqual(["added", "alreadyMember"]);
		expect(await testDb.db.select().from(groupMember)).toHaveLength(2);
	});

	it("remove deletes only that membership", async () => {
		const group = await create();
		await join(group.inviteCode);

		await members.remove(group.id, "bruno");

		expect(await members.find(group.id, "bruno")).toBeNull();
		expect(await members.find(group.id, "ana")).not.toBeNull();
	});

	it("touch upserts the visit time", async () => {
		const group = await create();

		await visits.touch("ana", group.id, at(1));
		await visits.touch("ana", group.id, at(2));

		expect(await testDb.db.select().from(groupVisit)).toEqual([
			{ userId: "ana", groupId: group.id, visitedAt: at(2) },
		]);
	});

	it("a row inserted without the new columns reads the domain's defaults (spec 035, RN-08)", async () => {
		await testDb.db.insert(groupTable).values({
			id: "old",
			name: "Antigo",
			adminId: "ana",
			inviteCode: "old-code",
			createdAt: at(0),
		});

		expect(await groups.findById("old")).toMatchObject({
			description: "",
			permissions: DEFAULT_GROUP_PERMISSIONS,
		});
	});

	it("creates and reads description and permissions (spec 035)", async () => {
		const group = await create({
			description: "Ensaio\nàs quintas",
			permissions: {
				...DEFAULT_GROUP_PERMISSIONS,
				membersCanSeeMembers: false,
				membersCanAssign: true,
			},
		});

		expect(await groups.findById(group.id)).toEqual(group);
	});

	it("saveDetails changes name and description only (spec 035, RN-09)", async () => {
		const group = await create();
		await groups.savePermission(group.id, "membersCanShare", false);

		await groups.saveDetails(group.id, {
			name: "Coral",
			description: "Ensaio",
		});

		expect(await groups.findById(group.id)).toEqual({
			...group,
			name: "Coral",
			description: "Ensaio",
			permissions: { ...group.permissions, membersCanShare: false },
		});
	});

	it("savePermission changes only its column; two at once keep both (spec 035, CA-08)", async () => {
		const group = await create();

		await Promise.all([
			groups.savePermission(group.id, "membersCanInvite", false),
			groups.savePermission(group.id, "membersCanAssign", true),
		]);

		expect((await groups.findById(group.id))?.permissions).toEqual({
			membersCanInvite: false,
			membersCanSeeMembers: true,
			membersCanShare: true,
			membersCanAssign: true,
		});
	});
});
