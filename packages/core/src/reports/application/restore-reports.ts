import { loadOwnedHeaders, type ReportReadDeps } from "./load-report";
import type { ReportRepository } from "./ports/report-repository";

export type RestoreReports = (input: {
	ownerId: string;
	gameIds: readonly string[];
}) => Promise<void>;

/** Puts reports back in the list, as they were (spec 015, RN-52). */
export function createRestoreReports(
	deps: ReportReadDeps & { reports: ReportRepository },
): RestoreReports {
	return async (input) => {
		const headers = await loadOwnedHeaders(deps, input);
		const gameIds = headers
			.filter((header) => header.trashedAt !== null)
			.map((header) => header.gameId);
		if (gameIds.length > 0) {
			await deps.reports.saveTrashed(gameIds, null);
		}
	};
}
