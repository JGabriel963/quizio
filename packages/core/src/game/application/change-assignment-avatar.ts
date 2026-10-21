import { type Avatar, type AvatarInput, parseAvatar } from "../domain/avatar";
import { AvatarFixedError } from "../domain/player";
import {
	type AssignmentPlayDeps,
	loadParticipant,
	type ParticipantReference,
} from "./assignment-play-view";
import type { PlayerRepository } from "./ports/player-repository";

export type ChangeAssignmentAvatar = (
	input: ParticipantReference & { avatar: AvatarInput },
) => Promise<{ avatar: Avatar }>;

/**
 * The character of an assignment's participant changes only before
 * "Começar" (spec 030, RN-06); only the avatar is written (spec 028).
 */
export function createChangeAssignmentAvatar(
	deps: AssignmentPlayDeps & {
		players: Pick<PlayerRepository, "saveAvatar">;
	},
): ChangeAssignmentAvatar {
	return async ({ avatar: input, ...participant }) => {
		const { player } = await loadParticipant(deps, participant);
		const avatar = parseAvatar(input);
		if (player.progress.phase !== "ready") {
			throw new AvatarFixedError("The character is chosen before starting");
		}
		await deps.players.saveAvatar(player.id, avatar);
		return { avatar };
	};
}
