import type { NotificationView } from "@quizio/core/notifications/application/list-notifications";
import { z } from "zod";

import { defineTool, type ToolContext } from "../define-tool";
import { ToolInputError } from "../tool-input-error";
import { WRITTEN_BY_PEOPLE } from "./groups";

/** What a notification opens on the screens (spec 040, RN-17). */
function linkOf(notification: NotificationView, { links }: ToolContext) {
	const { group, postId } = notification;
	if (group.id && postId) {
		return links.groupPost(group.id, postId);
	}
	return group.id ? links.group(group.id) : null;
}

/**
 * The bell's notifications (spec 044, RN-30, RN-31). Reading them is not
 * opening the bell: the red dot stays for the person.
 */
export const notificationTools = [
	defineTool({
		name: "list_notifications",
		title: "List notifications",
		description: `The person's notifications from their groups (posts, members joining the groups they administer, removals, deleted groups), newest first, 20 at a time: unread ones ("Novo") and read ones ("Anteriores"). Pass nextCursor back for more. Reading them marks nothing. ${WRITTEN_BY_PEOPLE}`,
		kind: "read",
		input: z.object({
			cursor: z
				.object({ at: z.iso.datetime({ offset: true }), id: z.string() })
				.nullish()
				.describe("The nextCursor of the page before."),
		}),
		run: async ({ cursor }, context) => {
			const { items, nextCursor, hasUnread } =
				await context.useCases.listNotifications({
					userId: context.identity.userId,
					cursor: cursor
						? { at: new Date(cursor.at), id: cursor.id }
						: undefined,
				});
			const withLinks = items.map((item) => ({
				...item,
				link: linkOf(item, context),
			}));
			return {
				unread: withLinks.filter((item) => !item.read),
				read: withLinks.filter((item) => item.read),
				hasUnread,
				nextCursor,
			};
		},
	}),
	defineTool({
		name: "mark_notifications_read",
		title: "Mark notifications as read",
		description:
			"Marks the given notifications as read (ids from list_notifications), or every one with all: true.",
		kind: "idempotent",
		input: z.object({
			ids: z.array(z.string()).min(1).max(100).optional(),
			all: z.boolean().optional(),
		}),
		run: async ({ ids, all }, context) => {
			const userId = context.identity.userId;
			if (all) {
				await context.useCases.markAllNotificationsRead({ userId });
				return { all: true };
			}
			if (!ids) {
				throw new ToolInputError("Send ids or all: true");
			}
			for (const notificationId of ids) {
				await context.useCases.markNotificationRead({ userId, notificationId });
			}
			return { read: ids };
		},
	}),
];
