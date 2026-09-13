import type { RealtimeMessage } from "@quizio/core/shared/application/ports/realtime-publisher";
import { afterEach, describe, expect, it } from "vitest";

import { createPusherRealtimePublisher } from "./pusher-realtime-publisher";
import { createPusherRealtimeSubscriber } from "./pusher-realtime-subscriber";
import type { RealtimeSubscriber } from "./realtime-subscriber";

// Matches the `realtime` service in docker-compose.yml.
const host = process.env.TEST_PUSHER_HOST ?? "127.0.0.1";
const port = Number(process.env.TEST_PUSHER_PORT ?? 6001);
const connection = {
	key: "quizio-key",
	cluster: "mt1",
	host,
	port,
	useTLS: false,
};

const publisher = createPusherRealtimePublisher({
	...connection,
	appId: "quizio",
	secret: "quizio-secret",
});

function nextEvent<T>(
	subscriber: RealtimeSubscriber,
	channel: string,
	event: string,
): Promise<T> {
	return new Promise((resolve) => {
		const unsubscribe = subscriber.subscribe<T>(channel, event, (payload) => {
			unsubscribe();
			resolve(payload);
		});
	});
}

describe("Pusher adapters against a Pusher-protocol server", () => {
	let subscriber: RealtimeSubscriber;

	afterEach(() => subscriber?.disconnect());

	it("delivers published events to subscribed clients", async () => {
		subscriber = createPusherRealtimeSubscriber(connection);
		const channel = `test-${crypto.randomUUID()}`;
		const subscribed = nextEvent(
			subscriber,
			channel,
			"pusher:subscription_succeeded",
		);
		const received = nextEvent<{ index: number }>(
			subscriber,
			channel,
			"question-started",
		);
		await subscribed;

		await publisher.publish({
			channel,
			event: "question-started",
			payload: { index: 3 },
		});

		expect(await received).toEqual({ index: 3 });
	});

	it("delivers every message of a multi-batch publish in order", async () => {
		subscriber = createPusherRealtimeSubscriber(connection);
		const channel = `test-${crypto.randomUUID()}`;
		const subscribed = nextEvent(
			subscriber,
			channel,
			"pusher:subscription_succeeded",
		);
		const received: number[] = [];
		const allReceived = new Promise<void>((resolve) => {
			subscriber.subscribe<{ index: number }>(channel, "tick", ({ index }) => {
				received.push(index);
				if (received.length === 12) resolve();
			});
		});
		await subscribed;

		const messages: RealtimeMessage[] = Array.from(
			{ length: 12 },
			(_, index) => ({
				channel,
				event: "tick",
				payload: { index },
			}),
		);
		await publisher.publishMany(messages);
		await allReceived;

		expect(received).toEqual(messages.map((_, index) => index));
	});
});
