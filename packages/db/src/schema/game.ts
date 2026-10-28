import { CORRECTNESS } from "@quizio/core/game/domain/answer";
import {
	GAME_END_REASONS,
	GAME_MODES,
	GAME_STATUSES,
} from "@quizio/core/game/domain/game";
import { GAME_PHASES } from "@quizio/core/game/domain/game-progress";
import { PARTICIPANT_PHASES } from "@quizio/core/game/domain/participant-progress";
import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const gameMode = pgEnum("game_mode", GAME_MODES);
export const gameStatus = pgEnum("game_status", GAME_STATUSES);
export const gameEndReason = pgEnum("game_end_reason", GAME_END_REASONS);
export const gamePhase = pgEnum("game_phase", GAME_PHASES);
export const answerCorrectness = pgEnum("answer_correctness", CORRECTNESS);
export const participantPhase = pgEnum("participant_phase", PARTICIPANT_PHASES);

/**
 * A live game (spec 008; ADR 0009). The whole state is here: no request
 * depends on another one's memory, and deadlines are stored instants.
 */
export const game = pgTable(
	"game",
	{
		id: text("id").primaryKey(),
		/**
		 * A live game or an assignment (spec 029; ADR 0014). An assignment's
		 * deadline is `expires_at`.
		 */
		mode: gameMode("mode").notNull().default("live"),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		/**
		 * A reference by id, not a foreign key: a game that started outlives its
		 * quiz, as a report (spec 015, RN-05; ADR 0010). The ones that never
		 * started are deleted with the quiz, by `deleteUnstartedByQuiz`.
		 */
		quizId: text("quiz_id").notNull(),
		/** The playable version the game was created with (RN-04). */
		quizVersion: integer("quiz_version").notNull(),
		title: text("title").notNull(),
		pin: text("pin").notNull(),
		status: gameStatus("status").notNull().default("lobby"),
		locked: boolean("locked").notNull().default(false),
		/** The game's options, copied from its host's preferences (spec 012). */
		showQuestionsOnDevices: boolean("show_questions_on_devices")
			.notNull()
			.default(false),
		randomizeQuestions: boolean("randomize_questions").notNull().default(false),
		randomizeAnswers: boolean("randomize_answers").notNull().default(false),
		/** "Personagens dos jogadores" (spec 028). */
		gameCharacters: boolean("game_characters").notNull().default(true),
		/** The quiz's theme when the game was created; never changes (spec 042). */
		themeId: text("theme_id").notNull().default("standard"),
		/**
		 * The custom theme's look as it was when the game was created (spec 043,
		 * ADR 0022); not a foreign key, so editing or deleting the theme never
		 * reaches the game.
		 */
		customTheme: jsonb("custom_theme"),
		/** "Timer da pergunta": always on live; an assignment may turn it off (spec 029). */
		questionTimer: boolean("question_timer").notNull().default(true),
		/**
		 * Since when autoplay is on; null while it is off (spec 014). One column
		 * for the switch and for the instant its countdowns count from.
		 */
		autoplaySince: timestamp("autoplay_since", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		/** When "Iniciar" took it out of the lobby; null until then (spec 015). */
		startedAt: timestamp("started_at", { withTimezone: true }),
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
		/**
		 * While the host reviews the typed answers of the results, and when the
		 * review was last closed (spec 031, RN-32). They belong to the stage:
		 * every transition clears them.
		 */
		reviewOpenedAt: timestamp("review_opened_at", { withTimezone: true }),
		reviewClosedAt: timestamp("review_closed_at", { withTimezone: true }),
		/**
		 * When the host's screen last told the server it is there (spec 013). It
		 * is written on its own, every few seconds, while the game is open.
		 */
		hostSeenAt: timestamp("host_seen_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		/** A PIN is unique among the games that were not ended (RN-09, RN-12). */
		uniqueIndex("game_unended_pin_idx")
			.on(table.pin)
			.where(sql`${table.endedAt} is null`),
		/**
		 * A host has one live game of a quiz that was not ended (RN-07; spec
		 * 037, RN-19: other hosts of a shared quiz have their own); its
		 * assignments are as many as the creator wants (spec 029, RN-05).
		 */
		uniqueIndex("game_unended_quiz_idx")
			.on(table.quizId, table.ownerId)
			.where(sql`${table.endedAt} is null and ${table.mode} = 'live'`),
		/** The newest assignment that had a PIN (spec 029, CA-42). */
		index("game_assignment_pin_idx")
			.on(table.pin, table.createdAt)
			.where(sql`${table.mode} = 'assignment'`),
		/** The reports list: a creator's games by their end (spec 015). */
		index("game_owner_ended_idx").on(table.ownerId, table.endedAt),
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
		/** 0 for who joined in the lobby; later for who joined in the middle (spec 012). */
		firstQuestionIndex: integer("first_question_index").notNull().default(0),
		/**
		 * The avatar's ids (spec 028). The default only serves the rows from
		 * before and the previous code during a deploy.
		 */
		character: text("character").notNull().default("koala"),
		/** Null is "Nenhum". */
		accessory: text("accessory"),
		joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
		removedAt: timestamp("removed_at", { withTimezone: true }),
		/**
		 * Where a participant of an assignment is (spec 030; ADR 0014): the
		 * three are set together, and are null in a live game.
		 */
		participantPhase: participantPhase("participant_phase"),
		progressQuestionIndex: integer("progress_question_index"),
		progressStartedAt: timestamp("progress_started_at", { withTimezone: true }),
		/** The answers of each question in the participant's order (RN-07). */
		choiceOrder: jsonb("choice_order").$type<string[][]>(),
	},
	(table) => [
		uniqueIndex("game_player_nickname_idx").on(table.gameId, table.nicknameKey),
		index("game_player_joined_idx").on(table.gameId, table.joinedAt),
	],
);

/**
 * The options a host left in the last game: the next one starts with them
 * (spec 012, RN-05). A table of its own, because `user` is generated by
 * Better Auth.
 */
export const hostPreferences = pgTable("host_preferences", {
	ownerId: text("owner_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	showQuestionsOnDevices: boolean("show_questions_on_devices")
		.notNull()
		.default(false),
	randomizeQuestions: boolean("randomize_questions").notNull().default(false),
	randomizeAnswers: boolean("randomize_answers").notNull().default(false),
	autoplay: boolean("autoplay").notNull().default(false),
	gameCharacters: boolean("game_characters").notNull().default(true),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

/**
 * The options a creator chose in the last assignment: the next one starts
 * with them (spec 029, RN-14). Apart from the live game's preferences.
 */
export const assignmentPreferences = pgTable("assignment_preferences", {
	ownerId: text("owner_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	gameCharacters: boolean("game_characters").notNull().default(false),
	questionTimer: boolean("question_timer").notNull().default(true),
	randomizeAnswers: boolean("randomize_answers").notNull().default(false),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

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
		/** The typed text of a type answer; null for the other types (spec 031). */
		text: text("text"),
		/** The picked number of a slider, up to 2 decimals; null for the other types (spec 032). */
		value: numeric("value", { precision: 14, scale: 2, mode: "number" }),
		/** Measured by the server, from the answers opening (RN-18). */
		responseTimeMs: integer("response_time_ms").notNull(),
		correctness: answerCorrectness("correctness").notNull(),
		/**
		 * Worked out on receipt (spec 010, RN-07); only the host's review of a
		 * type answer changes it afterwards (spec 031, RN-30).
		 */
		points: integer("points").notNull().default(0),
		receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
		/** When the host's review changed the answer (spec 031, RN-31). */
		reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
	},
	(table) => [
		primaryKey({
			columns: [table.gameId, table.questionIndex, table.playerId],
		}),
	],
);
