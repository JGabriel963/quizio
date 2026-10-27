import type { Clock } from "../../shared/application/ports/clock";
import type { NotificationInboxRepository } from "./ports/notification-inbox-repository";

export type MarkInboxSeen = (input: { userId: string }) => Promise<void>;

/** Opening the panel takes the red dot away, not the "Novo" (spec 040, RN-10). */
export function createMarkInboxSeen(deps: {
	notificationInbox: NotificationInboxRepository;
	clock: Clock;
}): MarkInboxSeen {
	return ({ userId }) =>
		deps.notificationInbox.markSeen(userId, deps.clock.now());
}
