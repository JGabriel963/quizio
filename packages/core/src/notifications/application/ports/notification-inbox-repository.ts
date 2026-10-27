/** A user's marks on their notifications (spec 040, RN-10, RN-15, RN-17). */
export interface NotificationInboxState {
	/** When the panel was last opened: the red dot. */
	seenAt: Date | null;
	/** "Marcar todas como lidas": everything up to it is read. */
	readAllAt: Date | null;
}

export interface NotificationInboxRepository {
	find(userId: string): Promise<NotificationInboxState>;
	markSeen(userId: string, at: Date): Promise<void>;
	/** Idempotent: the first time it was opened stays. */
	markRead(userId: string, notificationId: string, at: Date): Promise<void>;
	markAllRead(userId: string, at: Date): Promise<void>;
}
