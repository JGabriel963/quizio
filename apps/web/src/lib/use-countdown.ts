import { useEffect, useState } from "react";

const TICK_MS = 200;

/**
 * Time left of something the server said had `remainingMs` left at
 * `receivedAt` (this device's clock at arrival). The server's instants are
 * never compared with the device's clock: only the device's own elapsed time
 * counts (spec 009, RN-32).
 */
export function msLeft(
	remainingMs: number,
	receivedAt: number,
	now: number,
): number {
	return Math.max(0, remainingMs - Math.max(0, now - receivedAt));
}

/** What a countdown shows: whole seconds, and 0 only when the time is up. */
export function secondsLeft(ms: number): number {
	return Math.ceil(ms / 1000);
}

/**
 * Ticks down from what the server sent. `ms` is null when the stage has no
 * deadline (the results).
 */
export function useCountdown(
	remainingMs: number | null,
	receivedAt: number,
): { ms: number | null; seconds: number | null } {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (remainingMs === null) {
			return;
		}
		setNow(Date.now());
		const timer = setInterval(() => {
			const current = Date.now();
			setNow(current);
			if (msLeft(remainingMs, receivedAt, current) === 0) {
				clearInterval(timer);
			}
		}, TICK_MS);
		return () => clearInterval(timer);
	}, [remainingMs, receivedAt]);

	if (remainingMs === null) {
		return { ms: null, seconds: null };
	}
	const ms = msLeft(remainingMs, receivedAt, now);
	return { ms, seconds: secondsLeft(ms) };
}
