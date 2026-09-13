import { InMemoryRealtimeSubscriber } from "@quizio/realtime/testing/in-memory-realtime-subscriber";
import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { RealtimeProvider, useRealtimeEvent } from "./realtime";

function PlayerCount({ gameChannel }: { gameChannel: string | null }) {
	const [total, setTotal] = useState(0);
	useRealtimeEvent<{ total: number }>(gameChannel, "player-joined", (payload) =>
		setTotal(payload.total),
	);
	return <output aria-label="Jogadores">{total}</output>;
}

function renderWithRealtime(ui: React.ReactNode) {
	const subscriber = new InMemoryRealtimeSubscriber();
	const createSubscriber = vi.fn(() => subscriber);
	const view = render(
		<RealtimeProvider createSubscriber={createSubscriber}>
			{ui}
		</RealtimeProvider>,
	);
	return { subscriber, createSubscriber, ...view };
}

describe("useRealtimeEvent", () => {
	it("re-renders the component when the server publishes the event", () => {
		const { subscriber } = renderWithRealtime(
			<PlayerCount gameChannel="game-123" />,
		);

		act(() => subscriber.emit("game-123", "player-joined", { total: 7 }));

		expect(screen.getByRole("status", { name: "Jogadores" })).toHaveTextContent(
			"7",
		);
	});

	it("stops listening when the component unmounts", () => {
		const { subscriber, unmount } = renderWithRealtime(
			<PlayerCount gameChannel="game-123" />,
		);
		expect(subscriber.listenerCount("game-123", "player-joined")).toBe(1);

		unmount();

		expect(subscriber.listenerCount("game-123", "player-joined")).toBe(0);
	});

	it("does not connect until a component actually subscribes", () => {
		const { createSubscriber } = renderWithRealtime(
			<PlayerCount gameChannel={null} />,
		);

		expect(createSubscriber).not.toHaveBeenCalled();
	});

	it("moves the subscription when the channel changes", () => {
		const { subscriber, rerender, createSubscriber } = renderWithRealtime(
			<PlayerCount gameChannel="game-1" />,
		);

		rerender(
			<RealtimeProvider createSubscriber={createSubscriber}>
				<PlayerCount gameChannel="game-2" />
			</RealtimeProvider>,
		);

		expect(subscriber.listenerCount("game-1", "player-joined")).toBe(0);
		expect(subscriber.listenerCount("game-2", "player-joined")).toBe(1);
	});
});
