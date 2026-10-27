import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

function setup() {
	const api = createTestApi();
	for (const [id, name] of [
		["ana", "Ana"],
		["bruno", "Bruno"],
	] as const) {
		api.groups.addUser({ id, name, email: `${id}@quizio.test` });
	}
	api.notificationQuery.add("ana", {
		id: "post:p1",
		at: new Date("2026-06-01T11:00:00.000Z"),
		source: { kind: "post", postId: "p1", postKind: "message" },
		actor: { userId: "bruno", name: "Bruno" },
		group: { id: "g1", name: "GRUPO 1" },
		readAt: null,
	});
	return api;
}

describe("notification router (spec 040)", () => {
	it("summary, list, seen, read and readAll for the session's user", async () => {
		const api = setup();
		const ana = api.callerFor("ana");

		expect(await ana.notification.summary()).toEqual({
			hasNews: true,
			channel: "inbox-ana",
		});
		const { items, hasMore } = await ana.notification.list({});
		expect(hasMore).toBe(false);
		expect(items).toEqual([
			expect.objectContaining({ id: "post:p1", kind: "post", read: false }),
		]);

		await ana.notification.seen();
		expect((await ana.notification.summary()).hasNews).toBe(false);

		await ana.notification.read({ id: "post:p1" });
		expect((await ana.notification.list({})).items[0]?.read).toBe(true);

		await ana.notification.readAll();
		expect((await api.notificationInbox.find("ana")).readAllAt).toEqual(
			api.clock.now(),
		);
	});

	it("a post by Bruno signals Ana's inbox channel", async () => {
		const api = setup();
		const { groupId } = await api.callerFor("ana").group.create({
			name: "GRUPO 1",
		});
		const { code } = await api.callerFor("ana").group.invite.get({ groupId });
		await api.callerFor("bruno").group.invite.accept({ code });
		api.realtime.messages.length = 0;

		await api
			.callerFor("bruno")
			.group.post({ groupId, message: "Prova na sexta" });

		expect(api.realtime.messages).toEqual([
			{ channel: "inbox-ana", event: "inbox-changed", payload: {} },
		]);
	});

	it("requires a session", async () => {
		await expect(
			setup().callerFor(null).notification.summary(),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});
});
