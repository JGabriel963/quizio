import type { ReportRepository } from "@quizio/core/reports/application/ports/report-repository";
import { inArray } from "drizzle-orm";

import { game as gameTable } from "../../schema/game";
import { report as reportTable } from "../../schema/reports";
import type { Database } from "../../types";

export function createDrizzleReportRepository(db: Database): ReportRepository {
	return {
		async saveName(gameId, name) {
			// Only this column: a report trashed meanwhile stays in the trash.
			await db
				.insert(reportTable)
				.values({ gameId, name })
				.onConflictDoUpdate({ target: reportTable.gameId, set: { name } });
		},

		async saveTrashed(gameIds, at) {
			if (gameIds.length === 0) {
				return;
			}
			// Only this column: a report renamed meanwhile keeps its name.
			await db
				.insert(reportTable)
				.values(gameIds.map((gameId) => ({ gameId, trashedAt: at })))
				.onConflictDoUpdate({
					target: reportTable.gameId,
					set: { trashedAt: at },
				});
		},

		async delete(gameIds) {
			if (gameIds.length === 0) {
				return;
			}
			// Players, questions, answers and the report's row go with the game.
			await db.delete(gameTable).where(inArray(gameTable.id, [...gameIds]));
		},
	};
}
