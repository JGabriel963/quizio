import {
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Access keys a creator made for agents that only take a fixed key (spec 044,
 * RN-05, ADR 0023). Only the SHA-256 of the secret is stored, unique, so a
 * request finds its key by it; `start` is the part shown again.
 */
export const accessKey = pgTable(
	"access_key",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		start: text("start").notNull(),
		secretHash: text("secret_hash").notNull().unique(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
	},
	(table) => [index("access_key_user_idx").on(table.userId)],
);

/**
 * When each authorized agent was last used (spec 044, RN-14, RN-18). Better
 * Auth keeps the consent and its tokens but not this; it lives outside the
 * generated tables, so a regeneration never drops it. Deleted with the
 * consent by `disconnect`.
 */
export const agentConnectionUsage = pgTable(
	"agent_connection_usage",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		clientId: text("client_id").notNull(),
		lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull(),
	},
	(table) => [primaryKey({ columns: [table.userId, table.clientId] })],
);
