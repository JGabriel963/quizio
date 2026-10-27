import {
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * A user's marks on their notifications (spec 040; ADR 0020): the
 * notifications themselves are a reading of the groups, never stored.
 */
export const notificationInbox = pgTable("notification_inbox", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	/** When the panel was last opened: the red dot (RN-10). */
	seenAt: timestamp("seen_at", { withTimezone: true }),
	/** "Marcar todas como lidas" (RN-15). */
	readAllAt: timestamp("read_all_at", { withTimezone: true }),
});

/** One row per notification opened (RN-17), by its derived id. */
export const notificationRead = pgTable(
	"notification_read",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		notificationId: text("notification_id").notNull(),
		readAt: timestamp("read_at", { withTimezone: true }).notNull(),
	},
	(table) => [primaryKey({ columns: [table.userId, table.notificationId] })],
);

/**
 * Removed from a group, or the group deleted (RN-06): no key to the group,
 * whose rows are gone; its name is a copy.
 */
export const groupNotice = pgTable(
	"group_notice",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		kind: text("kind", { enum: ["removed", "groupDeleted"] }).notNull(),
		groupName: text("group_name").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("group_notice_user_idx").on(table.userId, table.createdAt.desc()),
	],
);
