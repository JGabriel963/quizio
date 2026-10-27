import { describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryNotificationInbox } from "../testing/in-memory-notification-inbox";
import { createMarkAllNotificationsRead } from "./mark-all-notifications-read";
import { createMarkInboxSeen } from "./mark-inbox-seen";
import { createMarkNotificationRead } from "./mark-notification-read";

function setup() {
	const notificationInbox = new InMemoryNotificationInbox();
	const clock = new FixedClock("2026-10-27T12:00:00.000Z");
	return { notificationInbox, clock, deps: { notificationInbox, clock } };
}

describe("marking notifications (spec 040)", () => {
	it("markInboxSeen stores now (RN-10)", async () => {
		const { notificationInbox, clock, deps } = setup();

		await createMarkInboxSeen(deps)({ userId: "ana" });

		expect(await notificationInbox.find("ana")).toEqual({
			seenAt: clock.now(),
			readAllAt: null,
		});
	});

	it("markNotificationRead is idempotent (RN-17)", async () => {
		const { notificationInbox, clock, deps } = setup();
		const markRead = createMarkNotificationRead(deps);
		const first = clock.now();

		await markRead({ userId: "ana", notificationId: "post:p1" });
		clock.advanceBy(60_000);
		await markRead({ userId: "ana", notificationId: "post:p1" });

		expect(notificationInbox.readAtOf("ana", "post:p1")).toEqual(first);
		expect(notificationInbox.readAtOf("bia", "post:p1")).toBeNull();
	});

	it("markAllNotificationsRead sets readAllAt (RN-15)", async () => {
		const { notificationInbox, clock, deps } = setup();

		await createMarkAllNotificationsRead(deps)({ userId: "ana" });

		expect((await notificationInbox.find("ana")).readAllAt).toEqual(
			clock.now(),
		);
	});
});
