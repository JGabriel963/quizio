import type {
	NotificationCursor,
	NotificationRecord,
} from "../../domain/notification";

/**
 * A user's notifications, read from the groups and the stored notices
 * (spec 040; ADR 0020), newest first, with `readAt` from the read marks.
 */
export interface NotificationQuery {
	list(
		userId: string,
		options: {
			/** One more than the page tells there is another. */
			limit: number;
			readAllAt: Date | null;
			/** Read ones before this are left out (RN-21). */
			keepReadSince: Date;
			/** Only what comes after it in the order: (at, id), newest first. */
			before?: NotificationCursor;
			/** Only the unread ones: is anything left to mark read (RN-15)? */
			unreadOnly?: boolean;
		},
	): Promise<NotificationRecord[]>;
	/** The newest notification's time, for the red dot (RN-10). */
	latestAt(userId: string): Promise<Date | null>;
}
