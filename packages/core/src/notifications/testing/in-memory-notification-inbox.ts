import type {
	NotificationInboxRepository,
	NotificationInboxState,
} from "../application/ports/notification-inbox-repository";

export class InMemoryNotificationInbox implements NotificationInboxRepository {
	readonly #states = new Map<string, NotificationInboxState>();
	readonly #reads = new Map<string, Date>();

	async find(userId: string): Promise<NotificationInboxState> {
		return {
			...(this.#states.get(userId) ?? { seenAt: null, readAllAt: null }),
		};
	}

	async markSeen(userId: string, at: Date): Promise<void> {
		this.#states.set(userId, { ...(await this.find(userId)), seenAt: at });
	}

	async markRead(
		userId: string,
		notificationId: string,
		at: Date,
	): Promise<void> {
		const key = `${userId}\u0000${notificationId}`;
		if (!this.#reads.has(key)) {
			this.#reads.set(key, at);
		}
	}

	async markAllRead(userId: string, at: Date): Promise<void> {
		this.#states.set(userId, { ...(await this.find(userId)), readAllAt: at });
	}

	/** For the in-memory query: when this notification was opened. */
	readAtOf(userId: string, notificationId: string): Date | null {
		return this.#reads.get(`${userId}\u0000${notificationId}`) ?? null;
	}
}
