import type { AssignmentPinGenerator } from "../application/ports/assignment-pin-generator";

/** Hands out the given PINs in order, then counts up from the last one. */
export class SequentialAssignmentPinGenerator
	implements AssignmentPinGenerator
{
	readonly #queue: string[];
	#last = 4352236;

	constructor(...pins: string[]) {
		this.#queue = [...pins];
	}

	generate(): string {
		const next = this.#queue.shift();
		if (next !== undefined) {
			this.#last = Number(next);
			return next;
		}
		this.#last += 1;
		return String(this.#last).padStart(8, "0");
	}
}
