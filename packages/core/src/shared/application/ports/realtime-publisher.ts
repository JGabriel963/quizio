/**
 * Port for server → client fan-out (live game state, lobby updates).
 * Implemented by `@quizio/realtime` over the Pusher protocol (Pusher cloud or
 * Soketi). The server stays authoritative: clients never publish, they call
 * the API and the API publishes the resulting event.
 */
export interface RealtimePublisher {
	publish(message: RealtimeMessage): Promise<void>;
	/** Publishes several messages in as few round trips as the adapter allows. */
	publishMany(messages: readonly RealtimeMessage[]): Promise<void>;
}

export interface RealtimeMessage<TPayload = unknown> {
	channel: string;
	event: string;
	payload: TPayload;
}
