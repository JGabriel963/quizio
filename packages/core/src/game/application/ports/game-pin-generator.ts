export interface GamePinGenerator {
	/** Six random digits, the first one never zero (spec 008, RN-09). */
	generate(): string;
}
