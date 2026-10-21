export interface AssignmentPinGenerator {
	/** Eight random digits; the first one may be zero (spec 029, RN-18). */
	generate(): string;
}
