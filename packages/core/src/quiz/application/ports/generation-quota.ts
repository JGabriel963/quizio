export type QuotaReservation =
	| { reserved: true; id: string }
	| { reserved: false; nextAvailableAt: Date };

/**
 * Each creator's generations in a rolling window (spec 027, RN-31 to RN-33).
 * A use is taken before the call to the model, in one step, so two requests
 * at the same time cannot both get the last one; a failed call gives it back.
 */
export interface GenerationQuota {
	/** Counts the owner's uses in (now - windowMs, now] and takes one when below `limit`. */
	reserve(
		ownerId: string,
		limit: number,
		windowMs: number,
		now: Date,
	): Promise<QuotaReservation>;
	release(id: string): Promise<void>;
	usage(
		ownerId: string,
		windowMs: number,
		now: Date,
	): Promise<{ used: number; oldestAt: Date | null }>;
}
