import type { NotificationQuery } from "../application/ports/notification-query";
import {
	isAfterCursor,
	isRead,
	type NotificationCursor,
	type NotificationRecord,
} from "../domain/notification";
import type { InMemoryNotificationInbox } from "./in-memory-notification-inbox";

/** Notifications given by hand per user; read marks come from the inbox fake. */
export class InMemoryNotificationQuery implements NotificationQuery {
	readonly #records = new Map<string, NotificationRecord[]>();

	constructor(private readonly inbox?: InMemoryNotificationInbox) {}

	add(userId: string, record: NotificationRecord): void {
		this.#records.set(userId, [...(this.#records.get(userId) ?? []), record]);
	}

	/** The source went (post deleted, group left): its notification goes. */
	remove(userId: string, notificationId: string): void {
		this.#records.set(
			userId,
			(this.#records.get(userId) ?? []).filter(
				(record) => record.id !== notificationId,
			),
		);
	}

	async list(
		userId: string,
		options: {
			limit: number;
			readAllAt: Date | null;
			keepReadSince: Date;
			before?: NotificationCursor;
			unreadOnly?: boolean;
		},
	): Promise<NotificationRecord[]> {
		return this.#withReads(userId)
			.filter((record) => {
				const unread = !isRead(record, options.readAllAt);
				const kept = options.unreadOnly
					? unread
					: unread || record.at.getTime() >= options.keepReadSince.getTime();
				return (
					kept && (!options.before || isAfterCursor(record, options.before))
				);
			})
			.sort((a, b) => b.at.getTime() - a.at.getTime() || (a.id < b.id ? 1 : -1))
			.slice(0, options.limit);
	}

	async latestAt(userId: string): Promise<Date | null> {
		const times = this.#withReads(userId).map((record) => record.at.getTime());
		return times.length > 0 ? new Date(Math.max(...times)) : null;
	}

	#withReads(userId: string): NotificationRecord[] {
		return (this.#records.get(userId) ?? []).map((record) => ({
			...record,
			readAt: record.readAt ?? this.inbox?.readAtOf(userId, record.id) ?? null,
		}));
	}
}
