import type {
	GenerationQuota,
	QuotaLimits,
	QuotaReservation,
} from "../application/ports/generation-quota";
import type { GenerationCharge } from "../domain/generation-credits";

interface Use {
	id: string;
	ownerId: string;
	at: Date;
	/** What the creator pays. */
	credits: number;
	/** What counts for the instance. */
	instanceCredits: number;
}

export class InMemoryGenerationQuota implements GenerationQuota {
	#uses: Use[] = [];
	#next = 1;

	async reserve(
		ownerId: string,
		credits: number,
		limits: QuotaLimits,
		windowMs: number,
		now: Date,
	): Promise<QuotaReservation> {
		const everybody = this.#inWindow(null, windowMs, now);
		const owner = this.#inWindow(ownerId, windowMs, now);
		const spent = everybody.reduce((sum, use) => sum + use.instanceCredits, 0);
		const used = owner.reduce((sum, use) => sum + use.credits, 0);
		const limited =
			spent + credits > limits.instance
				? { uses: everybody, limitedBy: "instance" as const }
				: used + credits > limits.perOwner
					? { uses: owner, limitedBy: "owner" as const }
					: null;
		if (limited) {
			const oldest = limited.uses[0];
			return {
				reserved: false,
				nextAvailableAt: new Date((oldest?.at ?? now).getTime() + windowMs),
				limitedBy: limited.limitedBy,
			};
		}
		const use = {
			id: `use-${this.#next++}`,
			ownerId,
			at: new Date(now),
			credits,
			instanceCredits: credits,
		};
		this.#uses.push(use);
		return { reserved: true, id: use.id };
	}

	async settle(id: string, charge: GenerationCharge): Promise<void> {
		this.#uses = this.#uses.map((use) =>
			use.id === id
				? { ...use, credits: charge.charged, instanceCredits: charge.spent }
				: use,
		);
	}

	async release(id: string): Promise<void> {
		this.#uses = this.#uses.filter((use) => use.id !== id);
	}

	async usage(ownerId: string, windowMs: number, now: Date) {
		const inWindow = this.#inWindow(ownerId, windowMs, now);
		return {
			used: inWindow.reduce((sum, use) => sum + use.credits, 0),
			oldestAt: inWindow[0] ? new Date(inWindow[0].at) : null,
		};
	}

	/** The owner's uses (everybody's with null) in (now - windowMs, now], oldest first. */
	#inWindow(ownerId: string | null, windowMs: number, now: Date): Use[] {
		const from = now.getTime() - windowMs;
		return this.#uses
			.filter(
				(use) =>
					(ownerId === null || use.ownerId === ownerId) &&
					use.at.getTime() > from &&
					use.at.getTime() <= now.getTime(),
			)
			.sort((a, b) => a.at.getTime() - b.at.getTime());
	}
}
