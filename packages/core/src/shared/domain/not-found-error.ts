import { DomainError } from "./domain-error";

/**
 * A domain error meaning "does not exist for this caller". Driving adapters
 * answer it as not found (404) instead of a bad request, and use it for
 * resources owned by someone else so their existence is never revealed.
 */
export abstract class NotFoundError extends DomainError {}
