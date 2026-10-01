import type { GameRepository } from "@quizio/core/game/application/ports/game-repository";
import type { Game } from "@quizio/core/game/domain/game";
import { and, asc, eq, isNull } from "drizzle-orm";

import { game as gameTable } from "../../schema/game";
import type { Database } from "../../types";

function toGame(row: typeof gameTable.$inferSelect): Game {
	return row;
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
				.values(game)
				.onConflictDoNothing()
				.returning({ id: gameTable.id });
			return inserted.length > 0 ? "created" : "pinTaken";
		},

		async save(game) {
			const { id, ...fields } = game;
			await db
				.insert(gameTable)
				.values(game)
				.onConflictDoUpdate({ target: gameTable.id, set: fields });
		},
	};
}
