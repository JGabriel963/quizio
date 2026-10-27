import type { NotificationInboxRepository } from "@quizio/core/notifications/application/ports/notification-inbox-repository";
import { eq } from "drizzle-orm";

import {
	notificationInbox,
	notificationRead,
} from "../../schema/notifications";
import type { Database } from "../../types";

/** A user's marks on their notifications (spec 040; ADR 0020). */
export function createDrizzleNotificationInbox(
	db: Database,
): NotificationInboxRepository {
	return {
		async find(userId) {
			const [row] = await db
				.select({
					seenAt: notificationInbox.seenAt,
					readAllAt: notificationInbox.readAllAt,
				})
				.from(notificationInbox)
				.where(eq(notificationInbox.userId, userId))
				.limit(1);
			return row ?? { seenAt: null, readAllAt: null };
		},

		async markSeen(userId, at) {
			await db
				.insert(notificationInbox)
				.values({ userId, seenAt: at })
				.onConflictDoUpdate({
					target: notificationInbox.userId,
					set: { seenAt: at },
				});
		},

		async markRead(userId, notificationId, at) {
			await db
				.insert(notificationRead)
				.values({ userId, notificationId, readAt: at })
				.onConflictDoNothing();
		},

		async markAllRead(userId, at) {
			await db
				.insert(notificationInbox)
				.values({ userId, readAllAt: at })
				.onConflictDoUpdate({
					target: notificationInbox.userId,
					set: { readAllAt: at },
				});
		},
	};
}
