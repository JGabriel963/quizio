/**
 * Limits attempts per key in fixed windows, to slow down guessing (game PINs,
 * spec 008, RN-39). The caller decides the limit.
 *
 * An attempt is taken **before** what it guards is tried, in one step, so
 * attempts made at the same time cannot all get in under the limit; the ones
 * that turn out not to count are given back.
 */
export interface AttemptLimiter {
	/**
	 * Takes one of the `limit` attempts of the window that contains `now`;
	 * false when none is left.
	 */
	reserve(
		key: string,
		windowMs: number,
		limit: number,
		now: Date,
	): Promise<boolean>;
	/** Gives back an attempt taken in the window that contains `now`. */
	release(key: string, windowMs: number, now: Date): Promise<void>;
}
