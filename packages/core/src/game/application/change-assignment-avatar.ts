import type { AttemptLimiter } from "../../shared/application/ports/attempt-limiter";
import {
	type Avatar,
	type AvatarInput,
	parseAvatar,
	sameAvatar,
} from "../domain/avatar";
import { AvatarFixedError } from "../domain/player";
import {
	type AssignmentPlayDeps,
	loadParticipant,
	type ParticipantReference,
} from "./assignment-play-view";
import { reserveAvatarChange } from "./avatar-change-limit";
import type { PlayerRepository } from "./ports/player-repository";

export type ChangeAssignmentAvatar = (
	input: ParticipantReference & { avatar: AvatarInput },
) => Promise<{ avatar: Avatar }>;

/**
 * The character of an assignment's participant changes only before
 * "Começar" (spec 030, RN-06); only the avatar is written (spec 028), and as
 * often as in a live game (spec 028, RN-12a).
 */
export function createChangeAssignmentAvatar(
	deps: AssignmentPlayDeps & {
		players: Pick<PlayerRepository, "saveAvatar">;
		attempts: AttemptLimiter;
	},
): ChangeAssignmentAvatar {
	return async ({ avatar: input, ...participant }) => {
		const { player } = await loadParticipant(deps, participant);
		const avatar = parseAvatar(input);
		if (player.progress.phase !== "ready") {
			throw new AvatarFixedError("The character is chosen before starting");
		}
		if (sameAvatar(player.avatar, avatar)) {
			return { avatar };
		}
		await reserveAvatarChange(deps, player.id);
		await deps.players.saveAvatar(player.id, avatar);
		return { avatar };
	};
}
