import type { GameRepository } from "@quizio/core/game/application/ports/game-repository";
import type { Game } from "@quizio/core/game/domain/game";
import { definedOptions } from "@quizio/core/game/domain/game-options";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { game as gameTable } from "../../schema/game";
import type { Database } from "../../types";

type GameRow = typeof gameTable.$inferSelect;

/**
 * The progress is three columns, set together; the options are one each.
 * Autoplay is on while its instant is set (spec 014).
 */
function toGame(row: GameRow): Game {
	const {
		questionIndex,
		phase,
		phaseStartedAt,
		showQuestionsOnDevices,
		randomizeQuestions,
		randomizeAnswers,
		...game
	} = row;
	return {
		...game,
		options: {
			showQuestionsOnDevices,
			randomizeQuestions,
			randomizeAnswers,
			autoplay: game.autoplaySince !== null,
		},
		progress:
			questionIndex !== null && phase !== null && phaseStartedAt !== null
				? { questionIndex, phase, phaseStartedAt }
				: null,
	};
}

function toRow(game: Game): GameRow {
	const { progress, options, ...row } = game;
	return {
		...row,
		// `autoplaySince` is the column: `options.autoplay` only repeats it.
		showQuestionsOnDevices: options.showQuestionsOnDevices,
		randomizeQuestions: options.randomizeQuestions,
		randomizeAnswers: options.randomizeAnswers,
		questionIndex: progress?.questionIndex ?? null,
		phase: progress?.phase ?? null,
		phaseStartedAt: progress?.phaseStartedAt ?? null,
	};
}

export function createDrizzleGameRepository(db: Database): GameRepository {
	return {
		async findById(id) {
			const [row] = await db
				.select()
				.from(gameTable)
				.where(eq(gameTable.id, id))
				.limit(1);
			return row ? toGame(row) : null;
		},

		async findUnendedByPin(pin) {
			const [row] = await db
				.select()
				.from(gameTable)
				.where(and(eq(gameTable.pin, pin), isNull(gameTable.endedAt)))
				.limit(1);
			return row ? toGame(row) : null;
		},

		async listUnendedByQuiz(quizId) {
			const rows = await db
				.select()
				.from(gameTable)
				.where(and(eq(gameTable.quizId, quizId), isNull(gameTable.endedAt)))
				.orderBy(asc(gameTable.createdAt));
			return rows.map(toGame);
		},

		async create(game) {
			// The only unique rule a new game can hit is the PIN among unended games.
			const inserted = await db
				.insert(gameTable)
				.values(toRow(game))
				.onConflictDoNothing()
				.returning({ id: gameTable.id });
			return inserted.length > 0 ? "created" : "pinTaken";
		},

		async save(game) {
			const { id, ...fields } = toRow(game);
			await db
				.insert(gameTable)
				.values({ id, ...fields })
				.onConflictDoUpdate({ target: gameTable.id, set: fields });
		},

		async saveLocked(gameId, locked) {
			// Only this column: where the game is belongs to `saveIfAt`.
			await db
				.update(gameTable)
				.set({ locked })
				.where(eq(gameTable.id, gameId));
		},

		async saveOptions(gameId, change, at) {
			// Only the columns of the options that changed: one switch never
			// writes over another turned at the same time.
			const { autoplay, ...switches } = definedOptions(change);
			const columns = {
				...switches,
				...(autoplay === undefined
					? {}
					: {
							// One already on keeps the instant it counts from.
							autoplaySince: autoplay
								? sql`coalesce(${gameTable.autoplaySince}, ${at.toISOString()}::timestamptz)`
								: null,
						}),
			};
			if (Object.keys(columns).length === 0) {
				return;
			}
			await db.update(gameTable).set(columns).where(eq(gameTable.id, gameId));
		},

		async saveHostSeen(gameId, at) {
			// Only this column, every few seconds: never the stage or a setting.
			await db
				.update(gameTable)
				.set({ hostSeenAt: at })
				.where(eq(gameTable.id, gameId));
		},

		async saveIfAt(game, from) {
			// One statement: of two requests leaving the same stage, the database
			// lets one through (spec 009, RN-12).
			const { status, questionCount, questionIndex, phase, phaseStartedAt } =
				toRow(game);
			const updated = await db
				.update(gameTable)
				.set({
					status,
					questionCount,
					questionIndex,
					phase,
					phaseStartedAt,
					endedAt: game.endedAt,
					endReason: game.endReason,
				})
				.where(
					and(
						eq(gameTable.id, game.id),
						isNull(gameTable.endedAt),
						...(from
							? [
									eq(gameTable.status, "playing"),
									eq(gameTable.questionIndex, from.questionIndex),
									eq(gameTable.phase, from.phase),
								]
							: [eq(gameTable.status, "lobby")]),
					),
				)
				.returning({ id: gameTable.id });
			return updated.length > 0;
		},
	};
}
