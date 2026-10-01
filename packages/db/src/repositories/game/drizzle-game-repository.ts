import type { GameRepository } from "@quizio/core/game/application/ports/game-repository";
import type { Game } from "@quizio/core/game/domain/game";
import { and, asc, eq, isNull } from "drizzle-orm";

import { game as gameTable } from "../../schema/game";
import type { Database } from "../../types";

type GameRow = typeof gameTable.$inferSelect;

/** The progress is three columns, set together. */
function toGame(row: GameRow): Game {
	const { questionIndex, phase, phaseStartedAt, ...game } = row;
	return {
		...game,
		progress:
			questionIndex !== null && phase !== null && phaseStartedAt !== null
				? { questionIndex, phase, phaseStartedAt }
				: null,
	};
}

function toRow(game: Game): GameRow {
	const { progress, ...row } = game;
	return {
		...row,
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
