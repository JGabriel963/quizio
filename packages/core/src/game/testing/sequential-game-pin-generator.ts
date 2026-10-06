import type { GamePinGenerator } from "../application/ports/game-pin-generator";

/** Hands out the given PINs in order, then counts up from the last one. */
export class SequentialGamePinGenerator implements GamePinGenerator {
	readonly #queue: string[];
	#last = 100000;

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
		return String(this.#last);
	}
}
