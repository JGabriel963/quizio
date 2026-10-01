import {
	DEFAULT_TIME_LIMIT_SECONDS,
	QUESTION_POINTS,
	QUESTION_TYPES,
} from "@quizio/core/quiz/domain/question";
import { QUIZ_STATUSES } from "@quizio/core/quiz/domain/quiz";
import { QUIZ_VISIBILITIES } from "@quizio/core/quiz/domain/quiz-details";
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

export const quizVisibility = pgEnum("quiz_visibility", QUIZ_VISIBILITIES);

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
		visibility: quizVisibility("visibility").notNull().default("private"),
		status: quizStatus("status").notNull().default("draft"),
		/** Number of the playable version in force; null in a draft (spec 006). */
		publishedVersion: integer("published_version"),
		publishedAt: timestamp("published_at", { withTimezone: true }),
		/** Derived: the live questions differ from the playable version (RN-19). */
		hasUnpublishedChanges: boolean("has_unpublished_changes")
			.notNull()
			.default(false),
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
		/** Read through `parseStoredContent`, so legacy `{}` rows get defaults. */
		content: jsonb("content").$type<unknown>().notNull().default({}),
		/** The optional image (spec 007); read through `parseStoredImage`. */
		image: jsonb("image").$type<unknown>(),
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
