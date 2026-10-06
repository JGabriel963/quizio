import { assertInTrash } from "../domain/report";
import { loadOwnedHeaders, type ReportReadDeps } from "./load-report";
import type { ReportRepository } from "./ports/report-repository";

export type DeleteReportsPermanently = (input: {
	ownerId: string;
	gameIds: readonly string[];
}) => Promise<void>;

/**
 * Deletes reports for good, only from the trash: the games go, with their
 * players and answers, and the quiz is left alone (spec 015, RN-53).
 */
export function createDeleteReportsPermanently(
	deps: ReportReadDeps & { reports: ReportRepository },
): DeleteReportsPermanently {
	return async (input) => {
		const headers = await loadOwnedHeaders(deps, input);
		headers.forEach(assertInTrash);
		await deps.reports.delete(headers.map((header) => header.gameId));
	};
}
