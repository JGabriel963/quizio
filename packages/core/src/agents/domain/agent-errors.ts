import { DomainError } from "../../shared/domain/domain-error";
import { NotFoundError } from "../../shared/domain/not-found-error";

/**
 * No bearer, an unknown or revoked key, an invalid token, or a connection that
 * was disconnected or sat idle too long (spec 044, RN-06, RN-16, RN-18). One
 * error for all, so a caller learns nothing about which it was.
 */
export class AgentUnauthorizedError extends DomainError {
	readonly code = "AGENT.UNAUTHORIZED";
	constructor() {
		super(
			"Connect this agent to Quizio first: authorize it, or send an access key as a bearer token.",
		);
	}
}

/** Over the requests a person may make in a minute (RN-33). */
export class AgentRateLimitedError extends DomainError {
	readonly code = "AGENT.RATE_LIMITED";
	constructor(readonly retryAfterSeconds: number) {
		super(`Too many requests. Try again in ${retryAfterSeconds} s.`);
	}
}

export class InvalidAccessKeyNameError extends DomainError {
	readonly code = "AGENT.INVALID_KEY_NAME";
	constructor() {
		super("An access key's name has 1 to 50 characters.");
	}
}

export class AccessKeyLimitError extends DomainError {
	readonly code = "AGENT.KEY_LIMIT";
	constructor(readonly limit: number) {
		super(
			`You already have ${limit} access keys. Revoke one to create another.`,
		);
	}
}

export class AccessKeyNotFoundError extends NotFoundError {
	readonly code = "AGENT.KEY_NOT_FOUND";
	constructor() {
		super("Access key not found.");
	}
}

export class AgentConnectionNotFoundError extends NotFoundError {
	readonly code = "AGENT.CONNECTION_NOT_FOUND";
	constructor() {
		super("Agent connection not found.");
	}
}
