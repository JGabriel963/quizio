import type { ReportReadGrants } from "../application/ports/report-read-grants";

/** Grants given by the test (`grant`), as a group's posts would. */
export class InMemoryReportReadGrants implements ReportReadGrants {
	readonly #grants = new Set<string>();

	grant(viewerId: string, gameId: string): void {
		this.#grants.add(`${viewerId}:${gameId}`);
	}

	async canRead(viewerId: string, gameId: string): Promise<boolean> {
		return this.#grants.has(`${viewerId}:${gameId}`);
	}
}
