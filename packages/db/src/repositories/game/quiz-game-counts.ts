import { and, count, countDistinct, eq, inArray, ne } from "drizzle-orm";

import { gamePlayer, game as gameTable } from "../../schema/game";
import type { Database } from "../../types";

/**
 * Games that started (a lobby is not one) with each quiz, of any host, and
 * their players: "N jogos" and "N participantes" of a shared quiz (spec 037,
 * RN-16) and of a public one (spec 039, RN-29).
 */
export async function quizGameCounts(
	db: Database,
	quizIds: readonly string[],
): Promise<Map<string, { games: number; participants: number }>> {
	const totals = new Map<string, { games: number; participants: number }>();
	if (quizIds.length === 0) {
		return totals;
	}
	const started = and(
		inArray(gameTable.quizId, [...new Set(quizIds)]),
		ne(gameTable.status, "lobby"),
	);
	const games = await db
		.select({ quizId: gameTable.quizId, games: count() })
		.from(gameTable)
		.where(started)
		.groupBy(gameTable.quizId);
	const players = await db
		.select({
			quizId: gameTable.quizId,
			participants: countDistinct(gamePlayer.id),
		})
		.from(gamePlayer)
		.innerJoin(gameTable, eq(gameTable.id, gamePlayer.gameId))
		.where(started)
		.groupBy(gameTable.quizId);
	for (const row of games) {
		totals.set(row.quizId, { games: row.games, participants: 0 });
	}
	for (const row of players) {
		const total = totals.get(row.quizId);
		if (total) {
			total.participants = row.participants;
		}
	}
	return totals;
}
