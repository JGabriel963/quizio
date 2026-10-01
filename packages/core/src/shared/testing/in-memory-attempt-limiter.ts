import type { AttemptLimiter } from "../application/ports/attempt-limiter";

export class InMemoryAttemptLimiter implements AttemptLimiter {
	readonly #counts = new Map<string, number>();

	async count(key: string, windowMs: number, now: Date): Promise<number> {
		return this.#counts.get(slotOf(key, windowMs, now)) ?? 0;
	}

	async record(key: string, windowMs: number, now: Date): Promise<void> {
		const slot = slotOf(key, windowMs, now);
		this.#counts.set(slot, (this.#counts.get(slot) ?? 0) + 1);
	}
}

function slotOf(key: string, windowMs: number, now: Date): string {
	return `${key}#${Math.floor(now.getTime() / windowMs)}`;
}
