/**
 * Counts attempts per key in fixed windows, to slow down guessing (game PINs,
 * spec 008, RN-39). The caller decides the limit.
 */
export interface AttemptLimiter {
	/** Attempts recorded for the key in the window that contains `now`. */
	count(key: string, windowMs: number, now: Date): Promise<number>;
	record(key: string, windowMs: number, now: Date): Promise<void>;
}
