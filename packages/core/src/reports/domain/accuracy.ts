/**
 * Right answers out of the possible ones. Kept as two integers, so the 35%
 * limit is compared exactly and only the screen rounds (spec 015, RN-16).
 */
export interface Accuracy {
	correct: number;
	total: number;
}

/** Below this a question is difficult and a participant needs help (RN-17, RN-18). */
export const LOW_ACCURACY_PERCENT = 35;

/** Rounded to the nearest integer; null when there was nothing to answer. */
export function accuracyPercent({ correct, total }: Accuracy): number | null {
	return total === 0 ? null : Math.round((correct * 100) / total);
}

/** Strictly below 35%: exactly 35% is not low. */
export function isLowAccuracy({ correct, total }: Accuracy): boolean {
	return total > 0 && correct * 100 < LOW_ACCURACY_PERCENT * total;
}

/** Sorts from the lowest to the highest, without rounding. */
export function compareAccuracy(a: Accuracy, b: Accuracy): number {
	return a.correct * b.total - b.correct * a.total;
}
