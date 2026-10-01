import { GAME_END_REASONS, GAME_STATUSES } from "@quizio/core/game/domain/game";
import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { quiz } from "./quiz";

export const gameStatus = pgEnum("game_status", GAME_STATUSES);
export const gameEndReason = pgEnum("game_end_reason", GAME_END_REASONS);

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
