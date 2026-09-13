/**
 * Base class for every business-rule violation raised by the domain or
 * application layers. Driving adapters (tRPC, server routes) translate these
 * into transport errors; anything that is not a DomainError is a bug.
 */
export abstract class DomainError extends Error {
	/** Stable, machine-readable identifier, e.g. `MEDIA.UNSUPPORTED_TYPE`. */
	abstract readonly code: string;

	constructor(message: string) {
		super(message);
		this.name = new.target.name;
	}
}
