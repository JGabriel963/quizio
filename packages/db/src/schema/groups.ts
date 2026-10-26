import { GROUP_ROLES } from "@quizio/core/groups/domain/group-member";
import { GROUP_POST_KINDS } from "@quizio/core/groups/domain/group-post";
import { isNotNull } from "drizzle-orm";
import {
	boolean,
	index,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
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
	/** "" when there is none (spec 035, RN-05). */
	description: text("description").notNull().default(""),
	adminId: text("admin_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	/** One valid link per group (RN-23). */
	inviteCode: text("invite_code").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	setupDismissedAt: timestamp("setup_dismissed_at", { withTimezone: true }),
	// What members may do (spec 035): the defaults are Kahoot's and repeat
	// DEFAULT_GROUP_PERMISSIONS, so groups made before get them too (RN-08).
	membersCanInvite: boolean("members_can_invite").notNull().default(true),
	membersCanSeeMembers: boolean("members_can_see_members")
		.notNull()
		.default(true),
	membersCanShare: boolean("members_can_share").notNull().default(true),
	membersCanAssign: boolean("members_can_assign").notNull().default(false),
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

export const groupPostKind = pgEnum("group_post_kind", GROUP_POST_KINDS);

/**
 * The group's feed (spec 038; ADR 0016). `game_id` has no foreign key on
 * purpose: the post outlives a deleted assignment and just loses its card.
 */
export const groupPost = pgTable(
	"group_post",
	{
		id: text("id").primaryKey(),
		groupId: text("group_id")
			.notNull()
			.references(() => groupTable.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		kind: groupPostKind("kind").notNull(),
		message: text("message"),
		gameId: text("game_id"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		// An assignment at most once in each group (RN-28).
		uniqueIndex("group_post_assignment_idx")
			.on(table.groupId, table.gameId)
			.where(isNotNull(table.gameId)),
		index("group_post_feed_idx").on(table.groupId, table.createdAt),
		index("group_post_game_idx").on(table.gameId),
	],
);

/** One like per member and post (RN-17). */
export const groupPostLike = pgTable(
	"group_post_like",
	{
		postId: text("post_id")
			.notNull()
			.references(() => groupPost.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(table) => [primaryKey({ columns: [table.postId, table.userId] })],
);
