import { describe, expect, it } from "vitest";

import { FixedInboxChannels } from "../testing/fixed-inbox-channels";
import { InMemoryNotificationInbox } from "../testing/in-memory-notification-inbox";
import { InMemoryNotificationQuery } from "../testing/in-memory-notification-query";
import { createGetInboxSummary } from "./get-inbox-summary";

const at = (minute: number) =>
	new Date(`2026-10-27T12:${String(minute).padStart(2, "0")}:00.000Z`);

function setup() {
	const inbox = new InMemoryNotificationInbox();
	const query = new InMemoryNotificationQuery(inbox);
	const summary = createGetInboxSummary({
		notificationQuery: query,
		notificationInbox: inbox,
		inboxChannels: new FixedInboxChannels(),
	});
	return { inbox, query, summary };
}

describe("getInboxSummary (spec 040, RN-10)", () => {
	it("hasNews until the panel is seen", async () => {
		const { inbox, query, summary } = setup();
		expect((await summary({ userId: "ana" })).hasNews).toBe(false);

		query.add("ana", {
			id: "post:p1",
			at: at(1),
			source: { kind: "post", postId: "p1", postKind: "message" },
			actor: { userId: "bruno", name: "Bruno" },
			group: { id: "g1", name: "GRUPO 1" },
			readAt: null,
		});
		expect((await summary({ userId: "ana" })).hasNews).toBe(true);

		await inbox.markSeen("ana", at(2));
		expect((await summary({ userId: "ana" })).hasNews).toBe(false);
	});

	it("returns the user's inbox channel", async () => {
		expect((await setup().summary({ userId: "ana" })).channel).toBe(
			"inbox-ana",
		);
	});
});
