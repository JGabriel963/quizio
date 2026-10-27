import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { groupNotice, notificationRead } from "../../schema/notifications";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleGroupNoticeRepository } from "./drizzle-group-notice-repository";
import { createDrizzleNotificationInbox } from "./drizzle-notification-inbox";

const at = (minute: number) =>
	new Date(`2026-10-27T12:${String(minute).padStart(2, "0")}:00.000Z`);

describe("Drizzle notification marks and notices (spec 040)", () => {
	let testDb: TestDatabase;

	beforeAll(async () => {
		testDb = await createTestDb();
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(user);
		await testDb.db.insert(user).values([
			{ id: "ana", name: "Ana", email: "ana@quizio.test" },
			{ id: "bia", name: "Bia", email: "bia@quizio.test" },
		]);
	});

	it("markSeen and markAllRead upsert one row per user", async () => {
		const inbox = createDrizzleNotificationInbox(testDb.db);

		expect(await inbox.find("ana")).toEqual({ seenAt: null, readAllAt: null });
		await inbox.markSeen("ana", at(1));
		await inbox.markAllRead("ana", at(2));
		await inbox.markSeen("ana", at(3));

		expect(await inbox.find("ana")).toEqual({
			seenAt: at(3),
			readAllAt: at(2),
		});
		expect(await inbox.find("bia")).toEqual({ seenAt: null, readAllAt: null });
	});

	it("markRead twice keeps one row, with the first time", async () => {
		const inbox = createDrizzleNotificationInbox(testDb.db);

		await inbox.markRead("ana", "post:p1", at(1));
		await inbox.markRead("ana", "post:p1", at(2));

		expect(await testDb.db.select().from(notificationRead)).toEqual([
			{ userId: "ana", notificationId: "post:p1", readAt: at(1) },
		]);
	});

	it("group notices are stored without a group key and go with the user", async () => {
		const notices = createDrizzleGroupNoticeRepository(testDb.db);
		const notice = {
			id: "deleted:g1:bia",
			userId: "bia",
			kind: "groupDeleted" as const,
			groupName: "GRUPO 1",
			at: at(1),
		};

		await notices.add([notice]);
		await notices.add([{ ...notice, groupName: "Outro" }]);
		expect(await testDb.db.select().from(groupNotice)).toEqual([
			{
				id: "deleted:g1:bia",
				userId: "bia",
				kind: "groupDeleted",
				groupName: "GRUPO 1",
				createdAt: at(1),
			},
		]);

		await testDb.db.delete(user).where(eq(user.id, "bia"));
		expect(await testDb.db.select().from(groupNotice)).toEqual([]);
	});
});
