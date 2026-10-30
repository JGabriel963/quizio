/**
 * Where the arrows, Home and End take the focus in the symbols' grid
 * (spec 047, RN-17): one place sideways, one row up or down, never out of the
 * grid. Null for any other key.
 */
export function gridMoveTarget(
	index: number,
	key: string,
	columns: number,
	count: number,
): number | null {
	const last = count - 1;
	switch (key) {
		case "ArrowRight":
			return Math.min(index + 1, last);
		case "ArrowLeft":
			return Math.max(index - 1, 0);
		case "ArrowDown":
			return index + columns <= last ? index + columns : index;
		case "ArrowUp":
			return index - columns >= 0 ? index - columns : index;
		case "Home":
			return 0;
		case "End":
			return last;
		default:
			return null;
	}
}
