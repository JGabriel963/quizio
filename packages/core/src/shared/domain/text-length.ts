const graphemes = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

/**
 * Counts user-perceived characters, so an emoji or an accent typed as a
 * combining mark counts as one. Used for every character limit in the domain
 * (quiz title, description, creator name).
 */
export function characterCount(text: string): number {
	let count = 0;
	for (const _ of graphemes.segment(text)) {
		count++;
	}
	return count;
}

/** Keeps the first `max` user-perceived characters, never splitting an emoji or accent. */
export function truncateCharacters(text: string, max: number): string {
	let result = "";
	let count = 0;
	for (const { segment } of graphemes.segment(text)) {
		if (count === max) {
			break;
		}
		result += segment;
		count++;
	}
	return result;
}
