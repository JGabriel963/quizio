import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { CONNECTION_RETRY_MS, isConnectionFailure } from "./connection";

/** How often the countdown to the next retry is redrawn. */
const TICK_MS = 250;

export type ConnectionState =
	| { status: "ok" }
	/** No answer from the server; the next retry is at `retryAt` (this device's clock). */
	| { status: "lost"; retryAt: number }
	/** A retry is on its way: still lost until it is answered. */
	| { status: "retrying" };

export type ConnectionAction =
	| { type: "lost"; now: number }
	| { type: "retry" }
	| { type: "failed"; now: number }
	| { type: "back" };

const CONNECTED: ConnectionState = { status: "ok" };

/** Lost, counting, retrying and back again (spec 013, RN-06). */
export function connectionReducer(
	state: ConnectionState,
	action: ConnectionAction,
): ConnectionState {
	switch (action.type) {
		case "lost":
			// Another failure while already lost does not restart the wait.
			return state.status === "ok"
				? { status: "lost", retryAt: action.now + CONNECTION_RETRY_MS }
				: state;
		case "retry":
			return state.status === "lost" ? { status: "retrying" } : state;
		case "failed":
			return state.status === "retrying"
				? { status: "lost", retryAt: action.now + CONNECTION_RETRY_MS }
				: state;
		case "back":
			return state.status === "ok" ? state : CONNECTED;
	}
}

export interface ConnectionWatch {
	/** The screen cannot reach the server (spec 013, RN-04). */
	lost: boolean;
	/** A retry is on its way. */
	retrying: boolean;
	/** Whole seconds to the next retry; 0 unless waiting for one. */
	retryInSeconds: number;
	/** "Reconectar": tries now, without waiting for the countdown (RN-07). */
	retryNow: () => void;
	/** What a request of the screen ended in: a connection failure marks it lost. */
	report: (error: unknown) => void;
}

/**
 * Watches whether a game screen can reach the server (spec 013). It is lost
 * when the browser says so or when a request the screen reports got no
 * answer; a refusal is the server answering. Lost, it asks again every 5
 * seconds with `probe`, and comes back by itself.
 */
export function useConnectionWatch(options: {
	enabled: boolean;
	/** Asks the server anything; it settles when the server answers, or fails to. */
	probe: () => Promise<unknown>;
	/** The server answered again. */
	onBack?: () => void;
}): ConnectionWatch {
	const [state, dispatch] = useReducer(connectionReducer, CONNECTED);
	const [now, setNow] = useState(() => Date.now());
	// What the callbacks below read: they are handed out once and stay the same.
	const latest = useRef({ state, ...options });
	latest.current = { state, ...options };
	const attempting = useRef(false);
	/** Goes up when the watch stops: an answer to an older retry is dropped. */
	const run = useRef(0);

	const attempt = useCallback(() => {
		const { state: current, enabled, probe } = latest.current;
		if (!enabled || current.status !== "lost" || attempting.current) {
			return;
		}
		attempting.current = true;
		dispatch({ type: "retry" });
		const startedIn = run.current;
		probe()
			.then(
				() => true,
				// A refusal is the server answering.
				(error: unknown) => !isConnectionFailure(error),
			)
			.then((answered) => {
				attempting.current = false;
				if (run.current !== startedIn) {
					return;
				}
				if (answered) {
					dispatch({ type: "back" });
					latest.current.onBack?.();
				} else {
					dispatch({ type: "failed", now: Date.now() });
				}
			});
	}, []);

	const report = useCallback((error: unknown) => {
		if (latest.current.enabled && isConnectionFailure(error)) {
			dispatch({ type: "lost", now: Date.now() });
		}
	}, []);

	const { enabled } = options;
	useEffect(() => {
		if (!enabled) {
			return;
		}
		const offline = () => dispatch({ type: "lost", now: Date.now() });
		window.addEventListener("offline", offline);
		window.addEventListener("online", attempt);
		return () => {
			window.removeEventListener("offline", offline);
			window.removeEventListener("online", attempt);
			// Disabled or gone: nothing is lost anymore, and no retry is owed.
			run.current += 1;
			attempting.current = false;
			dispatch({ type: "back" });
		};
	}, [enabled, attempt]);

	const retryAt = state.status === "lost" ? state.retryAt : null;
	useEffect(() => {
		if (retryAt === null) {
			return;
		}
		setNow(Date.now());
		const ticker = setInterval(() => setNow(Date.now()), TICK_MS);
		const timer = setTimeout(attempt, Math.max(0, retryAt - Date.now()));
		return () => {
			clearInterval(ticker);
			clearTimeout(timer);
		};
	}, [retryAt, attempt]);

	const secondsLeft = retryAt === null ? 0 : Math.ceil((retryAt - now) / 1_000);

	return {
		lost: state.status !== "ok",
		retrying: state.status === "retrying",
		retryInSeconds:
			retryAt === null
				? 0
				: Math.min(CONNECTION_RETRY_MS / 1_000, Math.max(1, secondsLeft)),
		retryNow: attempt,
		report,
	};
}
