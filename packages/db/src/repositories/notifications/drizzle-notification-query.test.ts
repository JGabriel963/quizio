import { adminOf, aGroup } from "@quizio/core/groups/testing/a-group";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { groupMember, groupPost, groupTable } from "../../schema/groups";
import { groupNotice } from "../../schema/notifications";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGroupRepository } from "../groups/drizzle-group-repository";
import { createDrizzleNotificationInbox } from "./drizzle-notification-inbox";
import { createDrizzleNotificationQuery } from "./drizzle-notification-query";

const at = (minute: number) =>
	new Date(`2026-10-27T12:${String(minute).padStart(2, "0")}:00.000Z`);
const keepAll = { readAllAt: null, keepReadSince: new Date(0), limit: 50 };

describe("DrizzleNotificationQuery (spec 040; ADR 0020)", () => {
	let testDb: TestDatabase;

	async function post(
		id: string,
		authorId: string,
		minute: number,
		kind: "message" | "assignment" | "quizShare" | "quizzesShare" = "message",
		groupId = "g1",
	) {
		await testDb.db.insert(groupPost).values({
			id,
			groupId,
			authorId,
			kind,
			message: kind === "message" ? "Oi" : null,
			createdAt: at(minute),
		});
	}

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bruno", name: "Bruno", email: "bruno@quizio.test" },
			{ id: "carla", name: "Carla", email: "carla@quizio.test" },
		]);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(groupTable);
		await testDb.db.delete(groupNotice);
		const group = aGroup({
			id: "g1",
			name: "GRUPO 1",
			adminId: "ana",
			inviteCode: "c1",
			createdAt: at(0),
		});
		await createDrizzleGroupRepository(testDb.db).create(group, adminOf(group));
		await testDb.db.insert(groupMember).values([
			{ groupId: "g1", userId: "bruno", role: "member", joinedAt: at(5) },
			{ groupId: "g1", userId: "carla", role: "member", joinedAt: at(10) },
		]);
	});

	it("a member gets the others' posts after joining, not their own nor earlier ones", async () => {
		await post("early", "ana", 7);
		await post("bruno-own", "bruno", 12);
		await post("later", "ana", 15);
		const query = createDrizzleNotificationQuery(testDb.db);

		const forCarla = await query.list("carla", keepAll);

		expect(forCarla.map((record) => record.id)).toEqual([
			"post:later",
			"post:bruno-own",
		]);
		expect(forCarla[0]).toEqual({
			id: "post:later",
			at: at(15),
			source: { kind: "post", postId: "later", postKind: "message" },
			actor: { userId: "ana", name: "Ana" },
			group: { id: "g1", name: "GRUPO 1" },
			readAt: null,
		});
		expect(
			(await query.list("bruno", keepAll)).map((record) => record.id),
		).toEqual(["post:later", "post:early"]);
	});

	it("an assignment post and a quiz share carry their post kind", async () => {
		await post("a1", "ana", 20, "assignment");
		await post("q1", "ana", 21, "quizzesShare");

		const records = await createDrizzleNotificationQuery(testDb.db).list(
			"bruno",
			keepAll,
		);

		expect(records.map((record) => record.source)).toEqual([
			{ kind: "post", postId: "q1", postKind: "quizzesShare" },
			{ kind: "post", postId: "a1", postKind: "assignment" },
		]);
	});

	it("only the admin gets the members' joins", async () => {
		const query = createDrizzleNotificationQuery(testDb.db);

		const forAna = await query.list("ana", keepAll);

		expect(forAna).toEqual([
			{
				id: `join:g1:carla:${at(10).getTime()}`,
				at: at(10),
				source: { kind: "joined" },
				actor: { userId: "carla", name: "Carla" },
				group: { id: "g1", name: "GRUPO 1" },
				readAt: null,
			},
			expect.objectContaining({
				id: `join:g1:bruno:${at(5).getTime()}`,
			}),
		]);
		expect(await query.list("bruno", keepAll)).toEqual([]);
	});

	it("removed and groupDeleted notices come with the copied group name", async () => {
		await testDb.db.insert(groupNotice).values({
			id: "n1",
			userId: "carla",
			kind: "removed",
			groupName: "GRUPO VELHO",
			createdAt: at(30),
		});

		const [notice] = await createDrizzleNotificationQuery(testDb.db).list(
			"carla",
			keepAll,
		);

		expect(notice).toEqual({
			id: "notice:n1",
			at: at(30),
			source: { kind: "removed" },
			actor: null,
			group: { id: null, name: "GRUPO VELHO" },
			readAt: null,
		});
	});

	it("a deleted post, a left group and a deleted group drop their notifications", async () => {
		await post("p1", "ana", 20);
		await post("p2", "ana", 21);
		const query = createDrizzleNotificationQuery(testDb.db);

		await testDb.db.delete(groupPost).where(eq(groupPost.id, "p1"));
		expect((await query.list("bruno", keepAll)).map((r) => r.id)).toEqual([
			"post:p2",
		]);

		await testDb.db
			.delete(groupMember)
			.where(
				and(eq(groupMember.groupId, "g1"), eq(groupMember.userId, "bruno")),
			);
		expect(await query.list("bruno", keepAll)).toEqual([]);

		await testDb.db.delete(groupTable).where(eq(groupTable.id, "g1"));
		expect(await query.list("carla", keepAll)).toEqual([]);
		expect(await query.list("ana", keepAll)).toEqual([]);
	});

	it("readAt comes from the read rows, old read ones drop, limit pages, latestAt is the newest", async () => {
		await post("p1", "ana", 20);
		await post("p2", "ana", 21);
		await post("p3", "ana", 22);
		const inbox = createDrizzleNotificationInbox(testDb.db);
		await inbox.markRead("bruno", "post:p2", at(40));
		const query = createDrizzleNotificationQuery(testDb.db);

		const records = await query.list("bruno", keepAll);
		expect(records.map((r) => [r.id, r.readAt])).toEqual([
			["post:p3", null],
			["post:p2", at(40)],
			["post:p1", null],
		]);
		expect(
			(await query.list("bruno", { ...keepAll, limit: 2 })).map((r) => r.id),
		).toEqual(["post:p3", "post:p2"]);
		// Read before the cutoff, by its row or by "marcar todas": left out.
		expect(
			(
				await query.list("bruno", {
					limit: 50,
					readAllAt: at(20),
					keepReadSince: at(23),
				})
			).map((r) => r.id),
		).toEqual(["post:p3"]);
		expect(await query.latestAt("bruno")).toEqual(at(22));
		expect(await query.latestAt("ana")).toEqual(at(10));
	});

	it("before pages after the cursor, across posts, joins and notices (Codex review of PR #23)", async () => {
		await post("p1", "bruno", 20);
		await post("p2", "bruno", 22);
		await post("p3", "carla", 22);
		await testDb.db.insert(groupNotice).values({
			id: "n1",
			userId: "ana",
			kind: "removed",
			groupName: "OUTRO",
			createdAt: at(21),
		});
		const query = createDrizzleNotificationQuery(testDb.db);

		const all = await query.list("ana", keepAll);
		expect(all.map((r) => r.id)).toEqual([
			"post:p3",
			"post:p2",
			"notice:n1",
			"post:p1",
			`join:g1:carla:${at(10).getTime()}`,
			`join:g1:bruno:${at(5).getTime()}`,
		]);

		const pages: string[][] = [];
		let before: { at: Date; id: string } | undefined;
		for (let page = 0; page < 3; page++) {
			const records = await query.list("ana", { ...keepAll, limit: 2, before });
			pages.push(records.map((r) => r.id));
			const last = records.at(-1);
			before = last && { at: last.at, id: last.id };
		}
		expect(pages.flat()).toEqual(all.map((r) => r.id));
	});

	it("unreadOnly keeps only the unread ones, wherever they are", async () => {
		await post("p1", "bruno", 20);
		await post("p2", "bruno", 21);
		const inbox = createDrizzleNotificationInbox(testDb.db);
		await inbox.markRead("ana", "post:p2", at(30));
		const query = createDrizzleNotificationQuery(testDb.db);

		expect(
			(
				await query.list("ana", {
					limit: 50,
					readAllAt: at(15),
					keepReadSince: new Date(0),
					unreadOnly: true,
				})
			).map((r) => r.id),
		).toEqual(["post:p1"]);
	});
});
