import type {
	GenerationQuota,
	QuotaReservation,
} from "../application/ports/generation-quota";

interface Use {
	id: string;
	ownerId: string;
	at: Date;
}

export class InMemoryGenerationQuota implements GenerationQuota {
	#uses: Use[] = [];
	#next = 1;

	async reserve(
		ownerId: string,
		limit: number,
		windowMs: number,
		now: Date,
	): Promise<QuotaReservation> {
		const inWindow = this.#inWindow(ownerId, windowMs, now);
		if (inWindow.length >= limit) {
			const oldest = inWindow[0] as Use;
			return {
				reserved: false,
				nextAvailableAt: new Date(oldest.at.getTime() + windowMs),
			};
		}
		const use = { id: `use-${this.#next++}`, ownerId, at: new Date(now) };
		this.#uses.push(use);
		return { reserved: true, id: use.id };
	}

	async release(id: string): Promise<void> {
		this.#uses = this.#uses.filter((use) => use.id !== id);
	}

	async usage(ownerId: string, windowMs: number, now: Date) {
		const inWindow = this.#inWindow(ownerId, windowMs, now);
		return {
			used: inWindow.length,
			oldestAt: inWindow[0] ? new Date(inWindow[0].at) : null,
		};
	}

	/** The owner's uses in (now - windowMs, now], oldest first. */
	#inWindow(ownerId: string, windowMs: number, now: Date): Use[] {
		const from = now.getTime() - windowMs;
		return this.#uses
			.filter(
				(use) =>
					use.ownerId === ownerId &&
					use.at.getTime() > from &&
					use.at.getTime() <= now.getTime(),
			)
			.sort((a, b) => a.at.getTime() - b.at.getTime());
	}
}
