import type { Clock } from "../../shared/application/ports/clock";
import {
	GameNotFoundError,
	isGameOpen,
	requireAssignment,
} from "../domain/game";
import { nicknameKeyOf } from "../domain/nickname";
import { ParticipantNotFoundError } from "../domain/participant-progress";
import { loadGame } from "./game-lifecycle";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

export type ResumeAssignment = (input: {
	gameId: string;
	nickname: string;
}) => Promise<{ playerId: string; secret: string; nickname: string }>;

/**
 * "Sim" to "Você é {apelido}?" (spec 030, RN-20 to RN-22): as in Kahoot,
 * the nickname is enough to take a participant back up, in any browser. Who
 * left in the middle of a question they did not answer starts it again with
 * its whole time (RN-21): the progress still says `answering`, because
 * nothing read it since. One whose time ran out on the screen was settled by
 * that read and stays unanswered; an ended activity is not started again.
 */
export function createResumeAssignment(deps: {
	games: GameRepository;
	players: Pick<PlayerRepository, "listActive" | "saveProgressIfAt">;
	clock: Clock;
}): ResumeAssignment {
	return async ({ gameId, nickname }) => {
		const stored = await loadGame(deps, gameId);
		if (!stored) {
			throw new GameNotFoundError("Assignment not found");
		}
		const game = requireAssignment(stored);
		const key = nicknameKeyOf(nickname.trim());
		const participant = (await deps.players.listActive(game.id)).find(
			(player) => nicknameKeyOf(player.nickname) === key,
		);
		if (!participant?.progress) {
			throw new ParticipantNotFoundError("Nobody has this nickname");
		}
		const { progress } = participant;
		if (isGameOpen(game) && progress.phase === "answering") {
			// Only if nobody moved it first: a second device keeps the first one's.
			await deps.players.saveProgressIfAt(participant.id, progress, {
				...progress,
				startedAt: deps.clock.now(),
			});
		}
		return {
			playerId: participant.id,
			secret: participant.secret,
			nickname: participant.nickname,
		};
	};
}
