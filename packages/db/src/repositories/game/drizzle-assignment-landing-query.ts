import type { AssignmentLandingQuery } from "@quizio/core/game/application/ports/assignment-landing-query";
import { knownThemeId } from "@quizio/core/shared/domain/theme";
import { readThemeLook } from "@quizio/core/shared/domain/theme-look";
import { and, count, eq, isNull } from "drizzle-orm";

import { user } from "../../schema/auth";
import { gamePlayer, game as gameTable } from "../../schema/game";
import { quiz as quizTable } from "../../schema/quiz";
import { report as reportTable } from "../../schema/reports";
import type { Database } from "../../types";

/**
 * What the activity's screen shows (spec 029, RN-46): the game, the name the
 * report gave it, and the creator's name from the account.
 */
export function createDrizzleAssignmentLandingQuery(
	db: Database,
): AssignmentLandingQuery {
	return {
		async find(gameId) {
			const [row] = await db
				.select({
					gameId: gameTable.id,
					title: gameTable.title,
					reportName: reportTable.name,
					creatorName: user.name,
					expiresAt: gameTable.expiresAt,
					endedAt: gameTable.endedAt,
					questionCount: gameTable.questionCount,
					themeId: gameTable.themeId,
					customTheme: gameTable.customTheme,
					// Null once the quiz was deleted for good (spec 015).
					coverImageKey: quizTable.coverImageKey,
				})
				.from(gameTable)
				.innerJoin(user, eq(user.id, gameTable.ownerId))
				.leftJoin(reportTable, eq(reportTable.gameId, gameTable.id))
				.leftJoin(quizTable, eq(quizTable.id, gameTable.quizId))
				.where(and(eq(gameTable.id, gameId), eq(gameTable.mode, "assignment")))
				.limit(1);
			if (!row) {
				return null;
			}
			const [players] = await db
				.select({ total: count() })
				.from(gamePlayer)
				.where(
					and(eq(gamePlayer.gameId, gameId), isNull(gamePlayer.removedAt)),
				);
			return {
				gameId: row.gameId,
				name: row.reportName ?? row.title,
				creatorName: row.creatorName,
				expiresAt: row.expiresAt,
				endedAt: row.endedAt,
				participantCount: players?.total ?? 0,
				coverImageKey: row.coverImageKey,
				questionCount: row.questionCount,
				themeId: knownThemeId(row.themeId),
				customTheme: readThemeLook(row.customTheme),
			};
		},
	};
}
