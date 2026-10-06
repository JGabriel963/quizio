import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Attempts per key in the current fixed window (`AttemptLimiter`; spec 008,
 * RN-39). One row per key: a new window overwrites the old one.
 */
export const attemptWindow = pgTable("attempt_window", {
	key: text("key").primaryKey(),
	windowStartedAt: timestamp("window_started_at", {
		withTimezone: true,
	}).notNull(),
	count: integer("count").notNull(),
});
