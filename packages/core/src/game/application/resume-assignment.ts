import type { Clock } from "../../shared/application/ports/clock";
import {
	GameNotFoundError,
	isGameOpen,
	requireAssignment,
} from "../domain/game";
import { hasPlayerSecret } from "../domain/player";
import type { ParticipantReference } from "./assignment-play-view";
import { loadGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

export type ResumeAssignment = (input: ParticipantReference) => Promise<void>;

/**
 * "Sim" to "Você é {apelido}?" (spec 030, RN-20 to RN-22), with the pair the
 * browser kept when it joined: only that browser goes on as the participant,
 * as in Kahoot, and a nickname alone takes nobody back (M5). Who left in the
 * middle of a question they did not answer starts it again with its whole
 * time (RN-21): the progress still says `answering`, because nothing read it
 * since. One whose time ran out on the screen was settled by that read and
 * stays unanswered; an ended activity is not started again.
 */
export function createResumeAssignment(deps: {
	games: GameRepository;
	players: Pick<PlayerRepository, "findById" | "saveProgressIfAt">;
	clock: Clock;
}): ResumeAssignment {
	return async ({ gameId, playerId, secret }) => {
		const stored = await loadGame(deps, gameId);
		if (!stored) {
			throw new GameNotFoundError("Assignment not found");
		}
		const game = requireAssignment(stored);
		const participant = await deps.players.findById(playerId);
		if (
			!participant ||
			participant.gameId !== game.id ||
			!hasPlayerSecret(participant, secret) ||
			!participant.progress
		) {
			throw new GameNotFoundError("Participant not found");
		}
		const { progress } = participant;
		if (isGameOpen(game) && progress.phase === "answering") {
			// Only if nobody moved it first: a second tab keeps the first one's.
			await deps.players.saveProgressIfAt(participant.id, progress, {
				...progress,
				startedAt: deps.clock.now(),
			});
		}
	};
}
