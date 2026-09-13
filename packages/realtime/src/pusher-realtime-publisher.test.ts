import type { RealtimeMessage } from "@quizio/core/shared/application/ports/realtime-publisher";
import { describe, expect, it, vi } from "vitest";

import {
	createPusherRealtimePublisher,
	type PusherServerConfig,
	type PusherTriggerClient,
} from "./pusher-realtime-publisher";

const config: PusherServerConfig = {
	appId: "app",
	key: "key",
	secret: "secret",
	cluster: "mt1",
	useTLS: false,
};

function fakeClient() {
	return {
		trigger: vi.fn<PusherTriggerClient["trigger"]>(),
		triggerBatch: vi.fn<PusherTriggerClient["triggerBatch"]>(),
	};
}

describe("createPusherRealtimePublisher", () => {
	it("triggers a single event with the payload as data", async () => {
		const client = fakeClient();
		const publisher = createPusherRealtimePublisher(config, client);

		await publisher.publish({
			channel: "game-123",
			event: "question-started",
			payload: { index: 0 },
		});

		expect(client.trigger).toHaveBeenCalledWith(
			"game-123",
			"question-started",
			{ index: 0 },
		);
	});

	it("splits many messages into ordered batches of at most 10 events", async () => {
		const client = fakeClient();
		const publisher = createPusherRealtimePublisher(config, client);
		const messages: RealtimeMessage[] = Array.from(
			{ length: 23 },
			(_, index) => ({
				channel: `player-${index}`,
				event: "answer-result",
				payload: { index },
			}),
		);

		await publisher.publishMany(messages);

		const batches = client.triggerBatch.mock.calls.map(([batch]) => batch);
		expect(batches.map((batch) => batch.length)).toEqual([10, 10, 3]);
		expect(batches.flat().map((event) => event.data)).toEqual(
			messages.map((m) => m.payload),
		);
		expect(batches[0]?.[0]).toEqual({
			channel: "player-0",
			name: "answer-result",
			data: { index: 0 },
		});
	});

	it("sends nothing when there are no messages", async () => {
		const client = fakeClient();

		await createPusherRealtimePublisher(config, client).publishMany([]);

		expect(client.triggerBatch).not.toHaveBeenCalled();
	});
});
