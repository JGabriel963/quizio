import type {
	AssignmentLandingQuery,
	AssignmentLandingRecord,
} from "../application/ports/assignment-landing-query";
import type { InMemoryGameRepository } from "./in-memory-game-repository";
import type { InMemoryPlayerRepository } from "./in-memory-player-repository";

/**
 * Reads the in-memory games and players; the reports' names and the
 * creators' names are set by the test.
 */
export class InMemoryAssignmentLandingQuery implements AssignmentLandingQuery {
	readonly reportNames = new Map<string, string>();
	readonly creatorNames = new Map<string, string>();

	constructor(
		private readonly games: InMemoryGameRepository,
		private readonly players: InMemoryPlayerRepository,
	) {}

	async find(gameId: string): Promise<AssignmentLandingRecord | null> {
		const game = await this.games.findById(gameId);
		if (game?.mode !== "assignment") {
			return null;
		}
		return {
			gameId: game.id,
			name: this.reportNames.get(game.id) ?? game.title,
			creatorName: this.creatorNames.get(game.ownerId) ?? "Ana",
			expiresAt: game.expiresAt,
			endedAt: game.endedAt,
			participantCount: await this.players.countActive(game.id),
		};
	}
}
