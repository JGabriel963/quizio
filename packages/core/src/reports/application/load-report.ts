import type { Clock } from "../../shared/application/ports/clock";
import {
	assertOutOfTrash,
	type ReportHeader,
	ReportNotFoundError,
	requireOwnedReport,
} from "../domain/report";
import type { ReportGame } from "../domain/report-game";
import type { ReportGameQuery } from "./ports/report-game-query";
import type { ReportReadGrants } from "./ports/report-read-grants";

export interface ReportReadDeps {
	reportGames: ReportGameQuery;
	clock: Clock;
	/** Who else may read a report (spec 038, RN-20a); none when absent. */
	reportReadGrants?: ReportReadGrants;
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

/**
 * A report to be read: the caller's, out of the trash (RN-51), or one the
 * caller was granted reading, which a trash hides (spec 038, RN-20a).
 * `input.ownerId` is the caller.
 */
export async function loadReport(
	deps: ReportReadDeps,
	input: { ownerId: string; gameId: string },
): Promise<ReportGame> {
	const header = await deps.reportGames.findHeader(
		input.gameId,
		deps.clock.now(),
	);
	if (header && header.ownerId !== input.ownerId) {
		const granted =
			header.trashedAt === null &&
			(await deps.reportReadGrants?.canRead(input.ownerId, input.gameId));
		if (!granted) {
			throw new ReportNotFoundError("Report not found");
		}
	} else {
		assertOutOfTrash(requireOwnedReport(header, input.ownerId));
	}
	const game = await deps.reportGames.findGame(input.gameId, deps.clock.now());
	if (!game) {
		throw new ReportNotFoundError("Report not found");
	}
	return game;
}
