import { useEffect, useRef, useState } from "react";

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

/** A countdown as the server told it: `remainingMs` left at `receivedAt`. */
export interface TimeLeft {
	remainingMs: number | null;
	receivedAt: number;
}

/**
 * Another reading of a countdown the screen is already showing. Every reading
 * runs a little late, by the time the answer took to arrive, and by a
 * different amount each time: taking each new one as it comes makes the bar
 * jump back. The one that ends first is the closest to the server's, so it is
 * the one kept.
 */
export function earliestDeadline(current: TimeLeft, next: TimeLeft): TimeLeft {
	if (current.remainingMs === null || next.remainingMs === null) {
		return next;
	}
	return current.receivedAt + current.remainingMs <=
		next.receivedAt + next.remainingMs
		? current
		: next;
}

/**
 * The countdown of what `key` names (a stage), steady across the readings the
 * screen gets of it: `earliestDeadline` of them all. Another key starts over.
 */
export function useSteadyTimeLeft(
	key: string,
	remainingMs: number | null,
	receivedAt: number,
): TimeLeft {
	const shown = useRef<(TimeLeft & { key: string }) | null>(null);
	const next = { remainingMs, receivedAt };
	const time =
		shown.current?.key === key ? earliestDeadline(shown.current, next) : next;
	shown.current = {
		key,
		remainingMs: time.remainingMs,
		receivedAt: time.receivedAt,
	};
	return { remainingMs: time.remainingMs, receivedAt: time.receivedAt };
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
