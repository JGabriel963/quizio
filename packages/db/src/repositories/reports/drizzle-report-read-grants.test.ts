import { adminOf, aGroup } from "@quizio/core/groups/testing/a-group";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { groupTable } from "../../schema/groups";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGroupMemberRepository } from "../groups/drizzle-group-member-repository";
import { createDrizzleGroupPostRepository } from "../groups/drizzle-group-post-repository";
import { createDrizzleGroupRepository } from "../groups/drizzle-group-repository";
import { createDrizzleReportReadGrants } from "./drizzle-report-read-grants";

const at = new Date("2026-10-26T12:00:00.000Z");

describe("DrizzleReportReadGrants (spec 038, RN-20a)", () => {
	let testDb: TestDatabase;
	let posts: ReturnType<typeof createDrizzleGroupPostRepository>;
	let grants: ReturnType<typeof createDrizzleReportReadGrants>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
			{ id: "carla", name: "Carla", email: "carla@quizio.test" },
		]);
		posts = createDrizzleGroupPostRepository(testDb.db);
		grants = createDrizzleReportReadGrants(testDb.db);
	});

	afterAll(() => testDb.close());

	/** Ana's group, with Bruno's assignment posted in it and Carla a member. */
	beforeEach(async () => {
		await testDb.db.delete(groupTable);
		const groups = createDrizzleGroupRepository(testDb.db);
		const members = createDrizzleGroupMemberRepository(testDb.db);
		const group = aGroup({ id: "g1", adminId: "ana", inviteCode: "code" });
		await groups.create(group, adminOf(group));
		for (const userId of ["bruno", "carla"]) {
			await members.addWithInvite({
				groupId: "g1",
				inviteCode: "code",
				userId,
				joinedAt: at,
			});
		}
		await posts.createPost({
			id: "post-1",
			groupId: "g1",
			authorId: "bruno",
			kind: "assignment",
			message: null,
			gameId: "game-1",
			sharedQuizId: null,
			file: null,
			createdAt: at,
		});
	});

	it("an admin of a group with the assignment may read", async () => {
		expect(await grants.canRead("ana", "game-1")).toBe(true);
		expect(await grants.canRead("ana", "game-2")).toBe(false);
	});

	it("a member, or an admin after the post is deleted, may not", async () => {
		expect(await grants.canRead("carla", "game-1")).toBe(false);

		await posts.deletePost("post-1");

		expect(await grants.canRead("ana", "game-1")).toBe(false);
	});
});
