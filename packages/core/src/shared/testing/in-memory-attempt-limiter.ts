import type { AttemptLimiter } from "../application/ports/attempt-limiter";

export class InMemoryAttemptLimiter implements AttemptLimiter {
	readonly #counts = new Map<string, number>();

	async reserve(
		key: string,
		windowMs: number,
		limit: number,
		now: Date,
	): Promise<boolean> {
		const slot = slotOf(key, windowMs, now);
		const taken = this.#counts.get(slot) ?? 0;
		if (taken >= limit) {
			return false;
		}
		this.#counts.set(slot, taken + 1);
		return true;
	}

	async release(key: string, windowMs: number, now: Date): Promise<void> {
		const slot = slotOf(key, windowMs, now);
		const taken = this.#counts.get(slot) ?? 0;
		if (taken > 0) {
			this.#counts.set(slot, taken - 1);
		}
	}
}

function slotOf(key: string, windowMs: number, now: Date): string {
	return `${key}#${Math.floor(now.getTime() / windowMs)}`;
}
