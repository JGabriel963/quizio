import type { GroupAssignmentQuery } from "@quizio/core/groups/application/ports/group-assignments";
import { and, eq, inArray } from "drizzle-orm";

import { user } from "../../schema/auth";
import { game as gameTable } from "../../schema/game";
import { quiz as quizTable } from "../../schema/quiz";
import { report as reportTable } from "../../schema/reports";
import type { Database } from "../../types";

/**
 * Assignments as the groups show them (spec 038; ADR 0016): the game, the
 * name the report gave it, the quiz's cover and the creator's name. A deleted
 * game, or a live one, is simply missing.
 */
export function createDrizzleGroupAssignmentQuery(
	db: Database,
): GroupAssignmentQuery {
	return {
		async findAssignments(gameIds) {
			if (gameIds.length === 0) {
				return [];
			}
			const rows = await db
				.select({
					gameId: gameTable.id,
					ownerId: gameTable.ownerId,
					ownerName: user.name,
					title: gameTable.title,
					reportName: reportTable.name,
					questionCount: gameTable.questionCount,
					coverImageKey: quizTable.coverImageKey,
					expiresAt: gameTable.expiresAt,
					endedAt: gameTable.endedAt,
				})
				.from(gameTable)
				.innerJoin(user, eq(user.id, gameTable.ownerId))
				.leftJoin(reportTable, eq(reportTable.gameId, gameTable.id))
				.leftJoin(quizTable, eq(quizTable.id, gameTable.quizId))
				.where(
					and(
						inArray(gameTable.id, [...gameIds]),
						eq(gameTable.mode, "assignment"),
					),
				);
			return rows.map(({ title, reportName, coverImageKey, ...row }) => ({
				...row,
				name: reportName ?? title,
				coverImageKey: coverImageKey ?? null,
			}));
		},
	};
}
