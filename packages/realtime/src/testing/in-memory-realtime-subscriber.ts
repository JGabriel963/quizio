import type {
	RealtimeHandler,
	RealtimeSubscriber,
} from "../realtime-subscriber";

export class InMemoryRealtimeSubscriber implements RealtimeSubscriber {
	readonly #handlers = new Map<string, Set<RealtimeHandler<unknown>>>();

	subscribe<TPayload>(
		channel: string,
		event: string,
		handler: RealtimeHandler<TPayload>,
	): () => void {
		const key = `${channel}::${event}`;
		const handlers = this.#handlers.get(key) ?? new Set();
		handlers.add(handler as RealtimeHandler<unknown>);
		this.#handlers.set(key, handlers);
		return () => {
			handlers.delete(handler as RealtimeHandler<unknown>);
		};
	}

	disconnect(): void {
		this.#handlers.clear();
	}

	/** Test helper: delivers an event as if the server had published it. */
	emit(channel: string, event: string, payload: unknown): void {
		for (const handler of this.#handlers.get(`${channel}::${event}`) ?? []) {
			handler(payload);
		}
	}

	listenerCount(channel: string, event: string): number {
		return this.#handlers.get(`${channel}::${event}`)?.size ?? 0;
	}
}
