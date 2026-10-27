import {
	loadPhotoUrls,
	type PersonView,
} from "../../shared/application/person-view";
import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { ProfilePhotoKeys } from "../../shared/application/ports/profile-photo-keys";
import {
	isRead,
	NOTIFICATIONS_PAGE_SIZE,
	type PostHeadlineKind,
	postHeadlineKind,
} from "../domain/notification";
import type { NotificationInboxRepository } from "./ports/notification-inbox-repository";
import type { NotificationQuery } from "./ports/notification-query";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The instance's retention of read notifications (RN-21). */
export interface NotificationSettings {
	readRetentionDays: number;
}

/** A notification as the panel draws it (spec 040, RN-14). */
export interface NotificationView {
	id: string;
	kind: PostHeadlineKind | "joined" | "removed" | "groupDeleted";
	actor: PersonView | null;
	group: { id: string | null; name: string };
	/** The post it opens (RN-17); null for joins and notices. */
	postId: string | null;
	/** Unread ones go under "Novo" (RN-13). */
	read: boolean;
	/** How long ago, never an instant for the device's clock. */
	ageMs: number;
}

export type ListNotifications = (input: {
	userId: string;
	/** Grows by 20 as the list scrolls to its end (RN-13). */
	limit?: number;
}) => Promise<{ items: NotificationView[]; hasMore: boolean }>;

export function createListNotifications(deps: {
	notificationQuery: NotificationQuery;
	notificationInbox: NotificationInboxRepository;
	profilePhotos: ProfilePhotoKeys;
	storage: Pick<ObjectStorage, "getPublicUrl">;
	clock: Clock;
	notificationSettings: NotificationSettings;
}): ListNotifications {
	return async ({ userId, limit = NOTIFICATIONS_PAGE_SIZE }) => {
		const now = deps.clock.now();
		const inbox = await deps.notificationInbox.find(userId);
		const records = await deps.notificationQuery.list(userId, {
			limit: limit + 1,
			readAllAt: inbox.readAllAt,
			keepReadSince: new Date(
				now.getTime() - deps.notificationSettings.readRetentionDays * DAY_MS,
			),
		});
		const page = records.slice(0, limit);
		const photoUrlOf = await loadPhotoUrls(
			page.flatMap((record) => (record.actor ? [record.actor.userId] : [])),
			deps,
		);
		return {
			items: page.map((record) => ({
				id: record.id,
				kind:
					record.source.kind === "post"
						? postHeadlineKind(record.source.postKind)
						: record.source.kind,
				actor: record.actor && {
					...record.actor,
					photoUrl: photoUrlOf(record.actor.userId),
				},
				group: record.group,
				postId: record.source.kind === "post" ? record.source.postId : null,
				read: isRead(record, inbox.readAllAt),
				ageMs: Math.max(0, now.getTime() - record.at.getTime()),
			})),
			hasMore: records.length > limit,
		};
	};
}
