import type { PlayerRepository } from "@quizio/core/game/application/ports/player-repository";
import type { Player } from "@quizio/core/game/domain/player";
import { and, asc, count as countRows, eq, isNull, lte } from "drizzle-orm";

import { gamePlayer as playerTable } from "../../schema/game";
import type { Database } from "../../types";

function toPlayer(row: typeof playerTable.$inferSelect): Player {
	return row;
}

const activeIn = (gameId: string) =>
	and(eq(playerTable.gameId, gameId), isNull(playerTable.removedAt));

export function createDrizzlePlayerRepository(db: Database): PlayerRepository {
	return {
		async findById(id) {
			const [row] = await db
				.select()
				.from(playerTable)
				.where(eq(playerTable.id, id))
				.limit(1);
			return row ? toPlayer(row) : null;
		},

		async listActive(gameId) {
			const rows = await db
				.select()
				.from(playerTable)
				.where(activeIn(gameId))
				.orderBy(asc(playerTable.joinedAt), asc(playerTable.id));
			return rows.map(toPlayer);
		},

		async countActive(gameId) {
			const [row] = await db
				.select({ total: countRows() })
				.from(playerTable)
				.where(activeIn(gameId));
			return row?.total ?? 0;
		},

		async countEligible(gameId, questionIndex) {
			const [row] = await db
				.select({ total: countRows() })
				.from(playerTable)
				.where(
					and(
						activeIn(gameId),
						lte(playerTable.firstQuestionIndex, questionIndex),
					),
				);
			return row?.total ?? 0;
		},

		async add(player) {
			// Two players racing for a nickname: the unique index picks one.
			const inserted = await db
				.insert(playerTable)
				.values(player)
				.onConflictDoNothing()
				.returning({ id: playerTable.id });
			return inserted.length > 0 ? "added" : "nicknameTaken";
		},

		async save(player) {
			const { id, ...fields } = player;
			await db
				.insert(playerTable)
				.values(player)
				.onConflictDoUpdate({ target: playerTable.id, set: fields });
		},
	};
}
