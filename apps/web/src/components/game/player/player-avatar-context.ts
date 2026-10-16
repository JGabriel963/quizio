import type { Avatar } from "@quizio/core/game/domain/avatar";
import { createContext, useContext } from "react";

/**
 * The player's own avatar, for the footer and the waiting screens (spec 028,
 * RN-10, RN-17). `avatar` is null with the characters off; `onEdit` is null
 * once the avatar is fixed (RN-13).
 */
export interface PlayerAvatarState {
	avatar: Avatar | null;
	onEdit: (() => void) | null;
}

export const PlayerAvatarContext = createContext<PlayerAvatarState>({
	avatar: null,
	onEdit: null,
});

export function usePlayerAvatar(): PlayerAvatarState {
	return useContext(PlayerAvatarContext);
}
