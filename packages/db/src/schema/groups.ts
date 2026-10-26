import { GROUP_ROLES } from "@quizio/core/groups/domain/group-member";
import {
	index,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const groupRole = pgEnum("group_role", GROUP_ROLES);

/**
 * A group (spec 034; ADR 0015). `group` is an SQL keyword: Drizzle quotes
 * it, and the TypeScript name says it is the table.
 */
export const groupTable = pgTable("group", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	adminId: text("admin_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	/** One valid link per group (RN-23). */
	inviteCode: text("invite_code").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	setupDismissedAt: timestamp("setup_dismissed_at", { withTimezone: true }),
});

/** Who belongs to a group; the admin is a row too (RN-01). */
export const groupMember = pgTable(
	"group_member",
	{
		groupId: text("group_id")
			.notNull()
			.references(() => groupTable.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: groupRole("role").notNull(),
		joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		// One membership per user and group (RN-29).
		primaryKey({ columns: [table.groupId, table.userId] }),
		index("group_member_user_idx").on(table.userId),
	],
);

/** When each user last opened each group (RN-10, RN-20). */
export const groupVisit = pgTable(
	"group_visit",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		groupId: text("group_id")
			.notNull()
			.references(() => groupTable.id, { onDelete: "cascade" }),
		visitedAt: timestamp("visited_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.groupId] }),
		index("group_visit_recent_idx").on(table.userId, table.visitedAt),
	],
);
