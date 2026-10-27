import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * The creator's profile photo (spec 039; ADR 0019): the key of a square the
 * browser cropped. `user.image`, which Google fills, is never read.
 */
export const profilePhoto = pgTable("profile_photo", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	key: text("key").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

/**
 * Why somebody deleted their account (spec 039, RN-41). On purpose without
 * any column that points at the account: it is read straight from the
 * database, and no screen shows it.
 */
export const accountDeletionFeedback = pgTable("account_deletion_feedback", {
	id: text("id").primaryKey(),
	reason: text("reason").notNull(),
	feedback: text("feedback"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
