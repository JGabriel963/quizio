import type { GenerationCharge } from "../../domain/generation-credits";

export type QuotaReservation =
	| { reserved: true; id: string }
	| {
			reserved: false;
			nextAvailableAt: Date;
			/** Whose limit was reached: the creator's or the whole instance's. */
			limitedBy: "owner" | "instance";
	  };

/** Credits allowed in a window: each creator's, and all of them together (spec 045, RN-03, RN-13). */
export interface QuotaLimits {
	perOwner: number;
	instance: number;
}

/**
 * The creation assistant's credits in a rolling window (spec 045), one use
 * per creation. A use takes the estimate before the call to the model, in one
 * step, so two requests at the same time cannot both get the last credits;
 * once the provider answered it is settled with what the creation cost, and
 * a call the provider did not charge gives it back.
 */
export interface GenerationQuota {
	/**
	 * Sums the credits in (now - windowMs, now], the owner's and everybody's,
	 * and takes `credits` when both still fit.
	 */
	reserve(
		ownerId: string,
		credits: number,
		limits: QuotaLimits,
		windowMs: number,
		now: Date,
	): Promise<QuotaReservation>;
	/** What the creation really cost: charged to the creator, spent for the instance (RN-09, RN-13). */
	settle(id: string, charge: GenerationCharge): Promise<void>;
	release(id: string): Promise<void>;
	/** The owner's credits in the window, and when the oldest of them was taken. */
	usage(
		ownerId: string,
		windowMs: number,
		now: Date,
	): Promise<{ used: number; oldestAt: Date | null }>;
}
