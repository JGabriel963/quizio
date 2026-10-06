import type { Clock } from "../../shared/application/ports/clock";
import {
	assertOutOfTrash,
	type ReportHeader,
	ReportNotFoundError,
	requireOwnedReport,
} from "../domain/report";
import type { ReportGame } from "../domain/report-game";
import type { ReportGameQuery } from "./ports/report-game-query";

export interface ReportReadDeps {
	reportGames: ReportGameQuery;
	clock: Clock;
}

/** The caller's report, in the trash or not; anybody else's does not exist (RN-03). */
export async function loadOwnedHeader(
	deps: ReportReadDeps,
	input: { ownerId: string; gameId: string },
): Promise<ReportHeader> {
	return requireOwnedReport(
		await deps.reportGames.findHeader(input.gameId, deps.clock.now()),
		input.ownerId,
	);
}

/** Every one of them is checked before anything is changed (RN-29). */
export function loadOwnedHeaders(
	deps: ReportReadDeps,
	input: { ownerId: string; gameIds: readonly string[] },
): Promise<ReportHeader[]> {
	return Promise.all(
		[...new Set(input.gameIds)].map((gameId) =>
			loadOwnedHeader(deps, { ownerId: input.ownerId, gameId }),
		),
	);
}

/** A report to be read: the caller's, and out of the trash (RN-51). */
export async function loadReport(
	deps: ReportReadDeps,
	input: { ownerId: string; gameId: string },
): Promise<ReportGame> {
	assertOutOfTrash(await loadOwnedHeader(deps, input));
	const game = await deps.reportGames.findGame(input.gameId, deps.clock.now());
	if (!game) {
		throw new ReportNotFoundError("Report not found");
	}
	return game;
}
