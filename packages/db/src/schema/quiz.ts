import {
	DEFAULT_TIME_LIMIT_SECONDS,
	QUESTION_POINTS,
	QUESTION_TYPES,
} from "@quizio/core/quiz/domain/question";
import { QUIZ_STATUSES } from "@quizio/core/quiz/domain/quiz";
import type { QuizVisibility } from "@quizio/core/quiz/domain/quiz-details";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { customTheme } from "./themes";

/**
 * Postgres cannot drop an enum value, so "unlisted" (spec 001) stays in the
 * type; the migration of spec 039 turned those rows private, and the quiz
 * repository reads anything but "public" as "private".
 */
export const quizVisibility = pgEnum("quiz_visibility", [
	"private",
	"unlisted",
	"public",
]);

export const quizStatus = pgEnum("quiz_status", QUIZ_STATUSES);

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
		visibility: quizVisibility("visibility")
			.$type<QuizVisibility>()
			.notNull()
			.default("private"),
		status: quizStatus("status").notNull().default("draft"),
		/** Number of the playable version in force; null in a draft (spec 006). */
		publishedVersion: integer("published_version"),
		publishedAt: timestamp("published_at", { withTimezone: true }),
		/** Derived: the live questions differ from the playable version (RN-19). */
		hasUnpublishedChanges: boolean("has_unpublished_changes")
			.notNull()
			.default(false),
		/**
		 * A theme id of the catalog (spec 042). Text, not an enum: themes come and
		 * go without a migration, and an id that left reads as the default.
		 */
		themeId: text("theme_id").notNull().default("standard"),
		/**
		 * One of the owner's custom themes (spec 043, ADR 0022); while set,
		 * `theme_id` is standard, which is what is left when the theme goes.
		 */
		customThemeId: text("custom_theme_id").references(() => customTheme.id, {
			onDelete: "set null",
		}),
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
		index("quiz_custom_theme_idx").on(table.customThemeId),
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
		/** Read through `parseStoredContent`, so legacy `{}` rows get defaults. */
		content: jsonb("content").$type<unknown>().notNull().default({}),
		/** The optional image (spec 007); read through `parseStoredImage`. */
		image: jsonb("image").$type<unknown>(),
		/** Added by the creation assistant (spec 027, RN-29). */
		aiGenerated: boolean("ai_generated").notNull().default(false),
	},
	(table) => [
		index("question_quiz_position_idx").on(table.quizId, table.position),
	],
);

/**
 * Playable versions (spec 006; ADR 0008): the question list frozen by the
 * editor's Salvar, one row per version, never updated. Only the core knows the
 * shape of `questions`.
 */
export const quizVersion = pgTable(
	"quiz_version",
	{
		quizId: text("quiz_id")
			.notNull()
			.references(() => quiz.id, { onDelete: "cascade" }),
		/** 1 for the first Salvar, then one more per version. */
		number: integer("number").notNull(),
		/** Read through `parseVersionQuestions`. */
		questions: jsonb("questions").$type<unknown>().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(table) => [primaryKey({ columns: [table.quizId, table.number] })],
);

/**
 * One row per generation with the creation assistant (spec 027, RN-31): the
 * quota counts the owner's rows of the last 24 hours. A failed generation's
 * row is deleted (RN-33).
 */
export const generationUsage = pgTable(
	"generation_usage",
	{
		id: text("id").primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("generation_usage_owner_created_idx").on(
			table.ownerId,
			table.createdAt,
		),
	],
);

/**
 * The options a creator last generated with (spec 027, RN-07); read through
 * `parseStoredGenerationOptions`.
 */
export const assistantPreferences = pgTable("assistant_preferences", {
	ownerId: text("owner_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	options: jsonb("options").$type<unknown>().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
