/**
 * Where the tags of a type answer's results start (spec 031, RN-23): spread
 * over the screen and a little tilted, as in Kahoot. Drawn from a seed, so the
 * same question always lays them out the same way, also after a reload.
 */
export interface ScatteredTag {
	/** Percent of the area's width and height, from its top left corner. */
	x: number;
	y: number;
	/** Degrees. */
	rotate: number;
}

const TAG_COLORS = [
	"bg-answer-red",
	"bg-answer-blue",
	"bg-answer-yellow",
	"bg-answer-green",
] as const;

/** Each tag's color, in turn, as Kahoot's tags. */
export function tagColorAt(index: number): string {
	return TAG_COLORS[index % TAG_COLORS.length] ?? TAG_COLORS[0];
}

/** A small deterministic generator (mulberry32) over the seed's hash. */
function randomFrom(seed: string): () => number {
	let state = 0;
	for (const char of seed) {
		state = (Math.imul(state, 31) + (char.codePointAt(0) ?? 0)) | 0;
	}
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
}

/**
 * One place per tag, on a grid of three columns so they do not pile up,
 * shifted a little inside their cell.
 */
export function scatterTags(count: number, seed: string): ScatteredTag[] {
	const random = randomFrom(seed);
	const columns = 3;
	const rows = Math.max(1, Math.ceil(count / columns));
	return Array.from({ length: count }, (_, index) => {
		const column = index % columns;
		const row = Math.floor(index / columns);
		return {
			x: ((column + 0.15 + random() * 0.4) / columns) * 100,
			y: ((row + 0.2 + random() * 0.4) / rows) * 100,
			rotate: Math.round((random() * 2 - 1) * 4),
		};
	});
}
