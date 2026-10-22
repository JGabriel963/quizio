import type { GameRepository } from "@quizio/core/game/application/ports/game-repository";
import type { Game } from "@quizio/core/game/domain/game";
import { definedOptions } from "@quizio/core/game/domain/game-options";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

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
		reviewOpenedAt,
		reviewClosedAt,
		showQuestionsOnDevices,
		randomizeQuestions,
		randomizeAnswers,
		gameCharacters,
		...game
	} = row;
	return {
		...game,
		options: {
			showQuestionsOnDevices,
			randomizeQuestions,
			randomizeAnswers,
			autoplay: game.autoplaySince !== null,
			gameCharacters,
		},
		progress:
			questionIndex !== null && phase !== null && phaseStartedAt !== null
				? {
						questionIndex,
						phase,
						phaseStartedAt,
						// Only while set: a stage without a review reads as before (spec 031).
						...(reviewOpenedAt && { reviewOpenedAt }),
						...(reviewClosedAt && { reviewClosedAt }),
					}
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
		gameCharacters: options.gameCharacters,
		questionIndex: progress?.questionIndex ?? null,
		phase: progress?.phase ?? null,
		phaseStartedAt: progress?.phaseStartedAt ?? null,
		reviewOpenedAt: progress?.reviewOpenedAt ?? null,
		reviewClosedAt: progress?.reviewClosedAt ?? null,
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

		async listUnendedByQuiz(quizId, modes) {
			const rows = await db
				.select()
				.from(gameTable)
				.where(
					and(
						eq(gameTable.quizId, quizId),
						isNull(gameTable.endedAt),
						...(modes ? [inArray(gameTable.mode, [...modes])] : []),
					),
				)
				.orderBy(asc(gameTable.createdAt), asc(gameTable.id));
			return rows.map(toGame);
		},

		async create(game) {
			// The unique rules a new game can hit are both among unended games:
			// the PIN, and one live game per quiz (spec 029, RN-05).
			const inserted = await db
				.insert(gameTable)
				.values(toRow(game))
				.onConflictDoNothing()
				.returning({ id: gameTable.id });
			return inserted.length > 0 ? "created" : "taken";
		},

		async save(game) {
			const { id, ...fields } = toRow(game);
			await db
				.insert(gameTable)
				.values({ id, ...fields })
				.onConflictDoUpdate({ target: gameTable.id, set: fields });
		},

		async saveDeadline(gameId, deadline) {
			// Only this column, and only while it is open (spec 029, RN-38).
			const updated = await db
				.update(gameTable)
				.set({ expiresAt: deadline })
				.where(and(eq(gameTable.id, gameId), isNull(gameTable.endedAt)))
				.returning({ id: gameTable.id });
			return updated.length > 0;
		},

		async findLatestAssignmentByPin(pin) {
			const [row] = await db
				.select()
				.from(gameTable)
				.where(and(eq(gameTable.pin, pin), eq(gameTable.mode, "assignment")))
				.orderBy(desc(gameTable.createdAt))
				.limit(1);
			return row ? toGame(row) : null;
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
			const {
				status,
				startedAt,
				questionCount,
				questionIndex,
				phase,
				phaseStartedAt,
				reviewOpenedAt,
				reviewClosedAt,
			} = toRow(game);
			const updated = await db
				.update(gameTable)
				.set({
					status,
					startedAt,
					questionCount,
					questionIndex,
					phase,
					phaseStartedAt,
					reviewOpenedAt,
					reviewClosedAt,
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

		async saveReview(gameId, from, review) {
			// Only the two instants, and only while the game is at those results.
			const updated = await db
				.update(gameTable)
				.set({
					reviewOpenedAt: review.openedAt,
					reviewClosedAt: review.closedAt,
				})
				.where(
					and(
						eq(gameTable.id, gameId),
						isNull(gameTable.endedAt),
						eq(gameTable.status, "playing"),
						eq(gameTable.questionIndex, from.questionIndex),
						eq(gameTable.phase, from.phase),
					),
				)
				.returning({ id: gameTable.id });
			return updated.length > 0;
		},

		async deleteUnstartedByQuiz(quizId) {
			// A game has questions from the moment it starts (spec 009, RN-29).
			await db
				.delete(gameTable)
				.where(
					and(eq(gameTable.quizId, quizId), eq(gameTable.questionCount, 0)),
				);
		},
	};
}
