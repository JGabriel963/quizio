/**
 * The instance's technical limits for agents (spec 044, RN-05, RN-18, RN-33),
 * configurable and documented, as the constitution (article VI) asks.
 */
export interface AgentSettings {
	/** Requests a person may make in a minute, all agents and keys together. */
	requestsPerMinute: number;
	maxActiveKeys: number;
	/** Days without use after which an authorized connection stops counting. */
	connectionIdleDays: number;
}

export const AGENT_DEFAULT_REQUESTS_PER_MINUTE = 120;
export const AGENT_DEFAULT_MAX_ACCESS_KEYS = 20;
export const AGENT_DEFAULT_CONNECTION_IDLE_DAYS = 90;

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
	requestsPerMinute: AGENT_DEFAULT_REQUESTS_PER_MINUTE,
	maxActiveKeys: AGENT_DEFAULT_MAX_ACCESS_KEYS,
	connectionIdleDays: AGENT_DEFAULT_CONNECTION_IDLE_DAYS,
};

/** The limit counts in fixed windows of a minute. */
export const AGENT_REQUEST_WINDOW_MS = 60_000;

/** "Último uso" is written at most this often per credential, not on every request. */
export const AGENT_USAGE_WRITE_INTERVAL_MS = 60_000;

/**
 * Seconds until the window that contains `now` ends, aligned as the attempt
 * limiter's windows are (`floor(now / window) * window`). At least one.
 */
export function retryAfterSeconds(now: Date, windowMs: number): number {
	const windowEnd = (Math.floor(now.getTime() / windowMs) + 1) * windowMs;
	return Math.max(1, Math.ceil((windowEnd - now.getTime()) / 1000));
}
