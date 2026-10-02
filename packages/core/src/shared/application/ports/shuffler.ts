export interface Shuffler {
	/** The same items in a random order; the list it was given is left alone. */
	shuffle<T>(items: readonly T[]): T[];
}
