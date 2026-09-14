export type RealtimeHandler<TPayload = unknown> = (payload: TPayload) => void;

/**
 * Client-side port for receiving server events. The UI depends on this
 * interface only; the Pusher adapter can be swapped (Ably, native WebSocket)
 * without touching components.
 */
export interface RealtimeSubscriber {
	/** Returns an unsubscribe function. */
	subscribe<TPayload>(
		channel: string,
		event: string,
		handler: RealtimeHandler<TPayload>,
	): () => void;
	disconnect(): void;
}
