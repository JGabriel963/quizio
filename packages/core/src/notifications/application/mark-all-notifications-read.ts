import type { Clock } from "../../shared/application/ports/clock";
import type { NotificationInboxRepository } from "./ports/notification-inbox-repository";

export type MarkAllNotificationsRead = (input: {
	userId: string;
}) => Promise<void>;

/** "Marcar todas como lidas": everything up to now (spec 040, RN-15). */
export function createMarkAllNotificationsRead(deps: {
	notificationInbox: NotificationInboxRepository;
	clock: Clock;
}): MarkAllNotificationsRead {
	return ({ userId }) =>
		deps.notificationInbox.markAllRead(userId, deps.clock.now());
}
