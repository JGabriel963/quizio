import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";

async function withNotifications() {
	const ana = await connectTestClient({ userId: "ana" });
	const { api } = ana;
	api.groups.addUser({
		id: "bruno",
		name: "Bruno",
		email: "bruno@quizio.test",
	});
	api.notificationQuery.add("ana", {
		id: "post:p1",
		at: new Date("2026-06-01T11:00:00.000Z"),
		source: { kind: "post", postId: "p1", postKind: "message" },
		actor: { userId: "bruno", name: "Bruno" },
		group: { id: "g1", name: "GRUPO 1" },
		readAt: null,
	});
	api.notificationQuery.add("ana", {
		id: "post:p0",
		at: new Date("2026-05-30T11:00:00.000Z"),
		source: { kind: "post", postId: "p0", postKind: "message" },
		actor: { userId: "bruno", name: "Bruno" },
		group: { id: "g1", name: "GRUPO 1" },
		readAt: new Date("2026-05-31T11:00:00.000Z"),
	});
	return ana;
}

describe("notification tools (spec 044, RN-30, RN-31)", () => {
	it("list_notifications gives Novo and Anteriores without marking the inbox seen", async () => {
		const ana = await withNotifications();

		const listed = await ana.ok("list_notifications", {});

		expect(listed).toMatchObject({
			unread: [
				{
					id: "post:p1",
					group: { name: "GRUPO 1" },
					link: "https://quizio.test/groups/g1/posts/p1",
				},
			],
			read: [{ id: "post:p0" }],
			nextCursor: null,
		});
		// The red dot is the person's: only opening the bell takes it away.
		expect(
			(await ana.api.container.useCases.getInboxSummary({ userId: "ana" }))
				.hasNews,
		).toBe(true);
	});

	it("get_group does not record a visit", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const { group } = (await ana.ok("create_group", { name: "Turma A" })) as {
			group: { id: string };
		};

		await ana.ok("get_group", { groupId: group.id });

		expect(
			await ana.api.container.useCases.listRecentGroups({ userId: "ana" }),
		).toEqual({ items: [] });
	});

	it("mark_notifications_read marks some or all", async () => {
		const ana = await withNotifications();

		await ana.ok("mark_notifications_read", { ids: ["post:p1"] });
		expect((await ana.ok("list_notifications", {})).unread).toEqual([]);

		await ana.ok("mark_notifications_read", { all: true });
		expect((await ana.api.notificationInbox.find("ana")).readAllAt).toEqual(
			ana.api.clock.now(),
		);
		expect(
			(await ana.call("mark_notifications_read", {})).data.error,
		).toMatchObject({ code: "INVALID_INPUT" });
	});
});
