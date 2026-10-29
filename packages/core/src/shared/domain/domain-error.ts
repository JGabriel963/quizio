/**
 * Base class for every business-rule violation raised by the domain or
 * application layers. Driving adapters (tRPC, server routes) translate these
 * into transport errors; anything that is not a DomainError is a bug.
 */
export abstract class DomainError extends Error {
	/** Stable, machine-readable identifier, e.g. `MEDIA.UNSUPPORTED_TYPE`. */
	abstract readonly code: string;

	/** `cause` keeps what failed underneath for the server's log, never for the client. */
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = new.target.name;
	}
}
