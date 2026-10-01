import {
	DEFAULT_TIME_LIMIT_SECONDS,
	QUESTION_POINTS,
	QUESTION_TYPES,
} from "@quizio/core/quiz/domain/question";
import { QUIZ_VISIBILITIES } from "@quizio/core/quiz/domain/quiz-details";
import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const quizVisibility = pgEnum("quiz_visibility", QUIZ_VISIBILITIES);

/** "published" arrives with the playable version (spec 006). */
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

export const questionType = pgEnum("question_type", QUESTION_TYPES);
export const questionPoints = pgEnum("question_points", QUESTION_POINTS);

/**
 * One row per question (ADR 0008): what every type shares is a column;
 * type-specific content is jsonb, whose shape only the core knows.
 */
export const question = pgTable(
	"question",
	{
		id: text("id").primaryKey(),
		quizId: text("quiz_id")
			.notNull()
			.references(() => quiz.id, { onDelete: "cascade" }),
		/**
		 * Index in the quiz's list, 0..n-1, rewritten by saveList. Not unique on
		 * purpose: a renumbering passes through duplicates inside its transaction.
		 */
		position: integer("position").notNull(),
		type: questionType("type").notNull(),
		text: text("text"),
		timeLimitSeconds: integer("time_limit_seconds")
			.notNull()
			.default(DEFAULT_TIME_LIMIT_SECONDS),
		points: questionPoints("points").notNull().default("standard"),
		/** Read through `parseQuizContent`, so legacy `{}` rows get defaults. */
		content: jsonb("content").$type<unknown>().notNull().default({}),
	},
	(table) => [
		index("question_quiz_position_idx").on(table.quizId, table.position),
	],
);
