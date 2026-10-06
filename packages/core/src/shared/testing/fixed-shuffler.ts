import type { Shuffler } from "../application/ports/shuffler";

/** A draw the tests can read: every list comes back backwards. */
export class FixedShuffler implements Shuffler {
	/** How many lists were shuffled. */
	calls = 0;

	shuffle<T>(items: readonly T[]): T[] {
		this.calls += 1;
		return [...items].reverse();
	}
}
