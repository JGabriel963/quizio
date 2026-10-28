import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * A creator's custom themes (spec 043, ADR 0022). The look is jsonb, whose
 * shape only the core knows (`ThemeLook`); quizzes point here with a foreign
 * key that clears itself when the theme is deleted (RN-19).
 */
export const customTheme = pgTable(
	"custom_theme",
	{
		id: text("id").primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		look: jsonb("look").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("custom_theme_owner_created_idx").on(
			table.ownerId,
			table.createdAt.desc(),
		),
	],
);

/** A logo or background sent to the bucket and not saved in a theme yet (RN-29). */
export const themeUpload = pgTable(
	"theme_upload",
	{
		key: text("key").primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(table) => [index("theme_upload_created_idx").on(table.createdAt)],
);
