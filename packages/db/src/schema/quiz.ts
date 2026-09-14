import { QUIZ_VISIBILITIES } from "@quizio/core/quiz/domain/quiz-details";
import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const quizVisibility = pgEnum("quiz_visibility", QUIZ_VISIBILITIES);

/** "published" arrives with the editor feature (spec 002). */
export const quizStatus = pgEnum("quiz_status", ["draft"]);

export const quiz = pgTable(
	"quiz",
	{
		id: text("id").primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: text("title"),
		description: text("description"),
		coverImageKey: text("cover_image_key"),
		visibility: quizVisibility("visibility").notNull().default("private"),
		status: quizStatus("status").notNull().default("draft"),
		/** Normalized display title (accents and case removed) for library search. */
		searchTitle: text("search_title").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
		trashedAt: timestamp("trashed_at", { withTimezone: true }),
	},
	(table) => [
		index("quiz_owner_trashed_updated_idx").on(
			table.ownerId,
			table.trashedAt,
			table.updatedAt,
		),
	],
);
