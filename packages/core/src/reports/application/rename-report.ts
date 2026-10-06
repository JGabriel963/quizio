import { assertOutOfTrash, parseReportName } from "../domain/report";
import { loadOwnedHeader, type ReportReadDeps } from "./load-report";
import type { ReportRepository } from "./ports/report-repository";

export type RenameReport = (input: {
	ownerId: string;
	gameId: string;
	name: string;
}) => Promise<{ name: string }>;

/**
 * Renames one report: the quiz and its other reports keep their names (spec
 * 015, RN-45).
 */
export function createRenameReport(
	deps: ReportReadDeps & { reports: ReportRepository },
): RenameReport {
	return async ({ name: raw, ...input }) => {
		assertOutOfTrash(await loadOwnedHeader(deps, input));
		const name = parseReportName(raw);
		await deps.reports.saveName(input.gameId, name);
		return { name };
	};
}
