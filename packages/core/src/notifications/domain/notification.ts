import type { GroupPostKind } from "../../groups/domain/group-post";

/**
 * Where a notification comes from (spec 040; ADR 0020). Posts and joins are a
 * reading of the groups; removals and deletions are stored notices, because
 * their source is gone.
 */
export type NotificationSource =
	| { kind: "post"; postId: string; postKind: GroupPostKind }
	| { kind: "joined" }
	| { kind: "removed" }
	| { kind: "groupDeleted" };

export type NotificationKind = NotificationSource["kind"];

export interface NotificationRecord {
	/** Stable, from the source: `post:…`, `join:…` or `notice:…`. */
	id: string;
	at: Date;
	source: NotificationSource;
	/** Who acted; none on the notices of RN-06. */
	actor: { userId: string; name: string } | null;
	/** The group's id is gone on the notices; the name is a copy. */
	group: { id: string | null; name: string };
	/** When this notification was opened, if it was. */
	readAt: Date | null;
}

/** Where the next page starts: the last one's (at, id), newest first (RN-13). */
export interface NotificationCursor {
	at: Date;
	id: string;
}

/** True when `record` comes after `cursor` in the order (at, id), newest first. */
export function isAfterCursor(
	record: Pick<NotificationRecord, "at" | "id">,
	cursor: NotificationCursor,
): boolean {
	const at = record.at.getTime();
	const cursorAt = cursor.at.getTime();
	return at < cursorAt || (at === cursorAt && record.id < cursor.id);
}

/** The panel shows 20 at a time (RN-13). */
export const NOTIFICATIONS_PAGE_SIZE = 20;

export const DEFAULT_READ_RETENTION_DAYS = 90;

/** Opened, or older than "Marcar todas como lidas" (RN-15, RN-17). */
export function isRead(
	notification: NotificationRecord,
	readAllAt: Date | null,
): boolean {
	return (
		notification.readAt !== null ||
		(readAllAt !== null && notification.at.getTime() <= readAllAt.getTime())
	);
}

/** Read ones older than the instance's retention stop showing (RN-21). */
export function isKept(
	notification: NotificationRecord,
	readAllAt: Date | null,
	now: Date,
	readRetentionMs: number,
): boolean {
	return (
		!isRead(notification, readAllAt) ||
		now.getTime() - notification.at.getTime() <= readRetentionMs
	);
}

/** The red dot: something arrived after the panel was last opened (RN-10). */
export function hasNews(latestAt: Date | null, seenAt: Date | null): boolean {
	return (
		latestAt !== null &&
		(seenAt === null || latestAt.getTime() > seenAt.getTime())
	);
}

export type PostHeadlineKind = "post" | "quiz" | "quizzes" | "assignment";

/** What a post notification says it was (RN-02 to RN-04). */
export function postHeadlineKind(postKind: GroupPostKind): PostHeadlineKind {
	switch (postKind) {
		case "message":
			return "post";
		case "quizShare":
			return "quiz";
		case "quizzesShare":
			return "quizzes";
		case "assignment":
			return "assignment";
	}
}

export function notificationIdOf(
	origin:
		| { kind: "post"; postId: string }
		| { kind: "joined"; groupId: string; userId: string; joinedAt: Date }
		| { kind: "notice"; noticeId: string },
): string {
	switch (origin.kind) {
		case "post":
			return `post:${origin.postId}`;
		case "joined":
			// Joining again is a new notification (RN-05).
			return `join:${origin.groupId}:${origin.userId}:${origin.joinedAt.getTime()}`;
		case "notice":
			return `notice:${origin.noticeId}`;
	}
}
