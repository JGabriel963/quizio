import { GAME_EVENTS, gameChannel } from "@quizio/core/game/domain/game-events";
import { InMemoryRealtimeSubscriber } from "@quizio/realtime/testing/in-memory-realtime-subscriber";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useHostGameRefresh } from "./host-game-refresh";
import { RealtimeProvider } from "./realtime";

function setup() {
	const subscriber = new InMemoryRealtimeSubscriber();
	const refresh = vi.fn();
	renderHook(() => useHostGameRefresh("game-1", refresh), {
		wrapper: ({ children }) => (
			<RealtimeProvider createSubscriber={() => subscriber}>
				{children}
			</RealtimeProvider>
		),
	});
	return { subscriber, refresh };
}

describe("useHostGameRefresh (spec 044, RN-34)", () => {
	it("options-changed is one of the events that refetch the host's game", () => {
		const { subscriber, refresh } = setup();

		act(() =>
			subscriber.emit(gameChannel("game-1"), GAME_EVENTS.optionsChanged, {}),
		);

		expect(refresh).toHaveBeenCalledTimes(1);
	});

	it("listens to that game only", () => {
		const { subscriber, refresh } = setup();

		act(() =>
			subscriber.emit(gameChannel("game-2"), GAME_EVENTS.optionsChanged, {}),
		);

		expect(refresh).not.toHaveBeenCalled();
	});
});
