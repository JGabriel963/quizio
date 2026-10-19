import { assertCanTrash } from "../domain/report";
import { loadOwnedHeaders, type ReportReadDeps } from "./load-report";
import type { ReportRepository } from "./ports/report-repository";

export type MoveReportsToTrash = (input: {
	ownerId: string;
	gameIds: readonly string[];
}) => Promise<void>;

/**
 * Takes reports out of the list, reversibly (spec 015, RN-50). What is
 * already in the trash keeps the instant it got there.
 */
export function createMoveReportsToTrash(
	deps: ReportReadDeps & { reports: ReportRepository },
): MoveReportsToTrash {
	return async (input) => {
		const headers = await loadOwnedHeaders(deps, input);
		// An open assignment is ended first: one in the selection refuses it all (spec 029, RN-41).
		for (const header of headers) {
			assertCanTrash(header);
		}
		const gameIds = headers
			.filter((header) => header.trashedAt === null)
			.map((header) => header.gameId);
		if (gameIds.length > 0) {
			await deps.reports.saveTrashed(gameIds, deps.clock.now());
		}
	};
}
