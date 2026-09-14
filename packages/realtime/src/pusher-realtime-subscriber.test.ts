import { describe, expect, it, vi } from "vitest";

import {
	createPusherRealtimeSubscriber,
	type PusherClientConfig,
	type PusherSubscribeClient,
} from "./pusher-realtime-subscriber";

const config: PusherClientConfig = {
	key: "key",
	cluster: "mt1",
	useTLS: false,
};

function fakeClient() {
	const channel = { bind: vi.fn(), unbind: vi.fn() };
	const client = {
		subscribe: vi.fn(() => channel),
		unsubscribe: vi.fn(),
		disconnect: vi.fn(),
	} satisfies PusherSubscribeClient;
	return { client, channel };
}

describe("createPusherRealtimeSubscriber", () => {
	it("binds the handler to the event on the subscribed channel", () => {
		const { client, channel } = fakeClient();
		const handler = vi.fn();

		createPusherRealtimeSubscriber(config, client).subscribe(
			"game-1",
			"player-joined",
			handler,
		);

		expect(client.subscribe).toHaveBeenCalledWith("game-1");
		expect(channel.bind).toHaveBeenCalledWith("player-joined", handler);
	});

	it("keeps the channel while other listeners remain and leaves it after the last one", () => {
		const { client, channel } = fakeClient();
		const subscriber = createPusherRealtimeSubscriber(config, client);

		const unsubscribeLobby = subscriber.subscribe(
			"game-1",
			"player-joined",
			vi.fn(),
		);
		const unsubscribeQuestion = subscriber.subscribe(
			"game-1",
			"question-started",
			vi.fn(),
		);

		unsubscribeLobby();
		expect(channel.unbind).toHaveBeenCalledTimes(1);
		expect(client.unsubscribe).not.toHaveBeenCalled();

		unsubscribeQuestion();
		expect(client.unsubscribe).toHaveBeenCalledWith("game-1");
	});

	it("ignores repeated unsubscribe calls", () => {
		const { client, channel } = fakeClient();
		const subscriber = createPusherRealtimeSubscriber(config, client);
		subscriber.subscribe("game-1", "player-joined", vi.fn());
		const unsubscribe = subscriber.subscribe(
			"game-1",
			"question-started",
			vi.fn(),
		);

		unsubscribe();
		unsubscribe();

		expect(channel.unbind).toHaveBeenCalledTimes(1);
		expect(client.unsubscribe).not.toHaveBeenCalled();
	});
});
