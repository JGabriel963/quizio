import type { PlayerRepository } from "@quizio/core/game/application/ports/player-repository";
import { CHARACTER_IDS, knownAvatar } from "@quizio/core/game/domain/avatar";
import type { ParticipantProgress } from "@quizio/core/game/domain/participant-progress";
import type { Player } from "@quizio/core/game/domain/player";
import {
	and,
	asc,
	count as countRows,
	eq,
	isNull,
	lte,
	max,
	sql,
} from "drizzle-orm";

import { gamePlayer as playerTable } from "../../schema/game";
import type { Database } from "../../types";

/**
 * An id that left the catalog reads as a known one: an old row never takes a
 * screen down (spec 028, plan "Leitura tolerante").
 */
function toPlayer(row: typeof playerTable.$inferSelect): Player {
	const {
		character,
		accessory,
		participantPhase,
		progressQuestionIndex,
		progressStartedAt,
		...player
	} = row;
	return {
		...player,
		progress:
			participantPhase !== null &&
			progressQuestionIndex !== null &&
			progressStartedAt !== null
				? {
						questionIndex: progressQuestionIndex,
						phase: participantPhase,
						startedAt: progressStartedAt,
					}
				: null,
		avatar: knownAvatar({ character, accessory }) ??
			knownAvatar({ character, accessory: null }) ?? {
				character: CHARACTER_IDS[0],
				accessory: null,
			},
	};
}

function toRow(player: Player): typeof playerTable.$inferInsert {
	const { avatar, progress, ...row } = player;
	return {
		...row,
		character: avatar.character,
		accessory: avatar.accessory,
		...progressColumns(progress),
	};
}

function progressColumns(progress: ParticipantProgress | null) {
	return {
		participantPhase: progress?.phase ?? null,
		progressQuestionIndex: progress?.questionIndex ?? null,
		progressStartedAt: progress?.startedAt ?? null,
	};
}

const activeIn = (gameId: string) =>
	and(eq(playerTable.gameId, gameId), isNull(playerTable.removedAt));

export function createDrizzlePlayerRepository(db: Database): PlayerRepository {
	return {
		async saveProgressIfAt(playerId, from, next) {
			// One statement: of two requests leaving the same screen, one wins (RN-12).
			const updated = await db
				.update(playerTable)
				.set(progressColumns(next))
				.where(
					and(
						eq(playerTable.id, playerId),
						eq(playerTable.participantPhase, from.phase),
						eq(playerTable.progressQuestionIndex, from.questionIndex),
						eq(playerTable.progressStartedAt, from.startedAt),
					),
				)
				.returning({ id: playerTable.id });
			return updated.length > 0;
		},

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

		async lastJoinedAt(gameId) {
			// Removed players too: taking one out must not move the countdown.
			const [row] = await db
				.select({ last: max(playerTable.joinedAt) })
				.from(playerTable)
				.where(eq(playerTable.gameId, gameId));
			return row?.last ?? null;
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

		async add(player, maxActive) {
			// Two players racing for a nickname: the unique index picks one.
			const insert = async (into: Database) => {
				const inserted = await into
					.insert(playerTable)
					.values(toRow(player))
					.onConflictDoNothing()
					.returning({ id: playerTable.id });
				return inserted.length > 0 ? "added" : "nicknameTaken";
			};
			if (maxActive === undefined) {
				return insert(db);
			}
			// Two players racing for the last place: who joins the game goes one
			// at a time, so each count sees the players that got in before. The
			// lock is the game's own and is let go with the transaction.
			return db.transaction(async (tx) => {
				await tx.execute(
					sql`select pg_advisory_xact_lock(hashtext(${`game-players:${player.gameId}`}))`,
				);
				const [row] = await tx
					.select({ total: countRows() })
					.from(playerTable)
					.where(activeIn(player.gameId));
				return (row?.total ?? 0) >= maxActive ? "full" : insert(tx);
			});
		},

		async save(player) {
			const { id, ...fields } = toRow(player);
			await db
				.insert(playerTable)
				.values(toRow(player))
				.onConflictDoUpdate({ target: playerTable.id, set: fields });
		},

		async saveAvatar(playerId, avatar) {
			// Only these two columns: the removal is written by `save`.
			await db
				.update(playerTable)
				.set({ character: avatar.character, accessory: avatar.accessory })
				.where(eq(playerTable.id, playerId));
		},
	};
}
