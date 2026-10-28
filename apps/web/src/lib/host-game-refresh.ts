import {
	GAME_EVENTS,
	gameChannel,
	type OptionsChangedPayload,
} from "@quizio/core/game/domain/game-events";

import { useRealtimeEvent } from "@/lib/realtime";

/**
 * Events after which the host's screen asks for the whole game again: they
 * only say that something changed, possibly somewhere else than this screen,
 * such as an AI agent turning a switch (spec 044, RN-34).
 */
export function useHostGameRefresh(gameId: string, refresh: () => void) {
	useRealtimeEvent<OptionsChangedPayload>(
		gameChannel(gameId),
		GAME_EVENTS.optionsChanged,
		() => refresh(),
	);
}
