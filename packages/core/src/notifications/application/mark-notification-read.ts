import type { Clock } from "../../shared/application/ports/clock";
import type { NotificationInboxRepository } from "./ports/notification-inbox-repository";

export type MarkNotificationRead = (input: {
	userId: string;
	notificationId: string;
}) => Promise<void>;

/**
 * Opening a notification reads it (spec 040, RN-17). The id is not checked:
 * it leads to no data, and a stray mark on someone's own inbox harms nothing.
 */
export function createMarkNotificationRead(deps: {
	notificationInbox: NotificationInboxRepository;
	clock: Clock;
}): MarkNotificationRead {
	return ({ userId, notificationId }) =>
		deps.notificationInbox.markRead(userId, notificationId, deps.clock.now());
}
