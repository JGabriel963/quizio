import { CORRECTNESS } from "@quizio/core/game/domain/answer";
import { GAME_END_REASONS, GAME_STATUSES } from "@quizio/core/game/domain/game";
import { GAME_PHASES } from "@quizio/core/game/domain/game-progress";
import { sql } from "drizzle-orm";
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
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { quiz } from "./quiz";

export const gameStatus = pgEnum("game_status", GAME_STATUSES);
export const gameEndReason = pgEnum("game_end_reason", GAME_END_REASONS);
export const gamePhase = pgEnum("game_phase", GAME_PHASES);
export const answerCorrectness = pgEnum("answer_correctness", CORRECTNESS);

/**
 * A live game (spec 008; ADR 0009). The whole state is here: no request
 * depends on another one's memory, and deadlines are stored instants.
 */
export const game = pgTable(
	"game",
	{
		id: text("id").primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		/** Games go with a quiz deleted for good; reports (spec 013) may revisit. */
		quizId: text("quiz_id")
			.notNull()
			.references(() => quiz.id, { onDelete: "cascade" }),
		/** The playable version the game was created with (RN-04). */
		quizVersion: integer("quiz_version").notNull(),
		title: text("title").notNull(),
		pin: text("pin").notNull(),
		status: gameStatus("status").notNull().default("lobby"),
		locked: boolean("locked").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		endedAt: timestamp("ended_at", { withTimezone: true }),
		endReason: gameEndReason("end_reason"),
		/** 0 until the game starts (spec 009). */
		questionCount: integer("question_count").notNull().default(0),
		/**
		 * Where a game in progress is: the three are set together, and are null in
		 * the lobby and once the game is over. The phase's deadline is this
		 * instant plus its duration (ADR 0009).
		 */
		questionIndex: integer("question_index"),
		phase: gamePhase("phase"),
		phaseStartedAt: timestamp("phase_started_at", { withTimezone: true }),
	},
	(table) => [
		/** A PIN is unique among the games that were not ended (RN-09, RN-12). */
		uniqueIndex("game_unended_pin_idx")
			.on(table.pin)
			.where(sql`${table.endedAt} is null`),
		index("game_unended_quiz_idx")
			.on(table.quizId)
			.where(sql`${table.endedAt} is null`),
	],
);

/** Anonymous players of a game. A removed player keeps the row (RN-30). */
export const gamePlayer = pgTable(
	"game_player",
	{
		id: text("id").primaryKey(),
		gameId: text("game_id")
			.notNull()
			.references(() => game.id, { onDelete: "cascade" }),
		nickname: text("nickname").notNull(),
		/** Normalized nickname: what must be unique in the game (RN-42). */
		nicknameKey: text("nickname_key").notNull(),
		/** Proves, from the browser that joined, who the player is (ADR 0009). */
		secret: text("secret").notNull(),
		joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
		removedAt: timestamp("removed_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("game_player_nickname_idx").on(table.gameId, table.nicknameKey),
		index("game_player_joined_idx").on(table.gameId, table.joinedAt),
	],
);

/**
 * The questions of a game, copied from the playable version when it starts
 * (spec 009, RN-29): the game never reads the quiz again.
 */
export const gameQuestion = pgTable(
	"game_question",
	{
		gameId: text("game_id")
			.notNull()
			.references(() => game.id, { onDelete: "cascade" }),
		index: integer("index").notNull(),
		/** Read through `parseStoredGameQuestion`. */
		question: jsonb("question").$type<unknown>().notNull(),
	},
	(table) => [primaryKey({ columns: [table.gameId, table.index] })],
);

/** One answer per player per question: the key is the rule (spec 009, RN-17). */
export const gameAnswer = pgTable(
	"game_answer",
	{
		gameId: text("game_id")
			.notNull()
			.references(() => game.id, { onDelete: "cascade" }),
		questionIndex: integer("question_index").notNull(),
		playerId: text("player_id")
			.notNull()
			.references(() => gamePlayer.id, { onDelete: "cascade" }),
		choiceIds: jsonb("choice_ids").$type<string[]>().notNull(),
		/** Measured by the server, from the answers opening (RN-18). */
		responseTimeMs: integer("response_time_ms").notNull(),
		correctness: answerCorrectness("correctness").notNull(),
		/** Worked out on receipt and never changed (spec 010, RN-07). */
		points: integer("points").notNull().default(0),
		receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.gameId, table.questionIndex, table.playerId],
		}),
	],
);
