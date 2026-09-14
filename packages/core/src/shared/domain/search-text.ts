/**
 * Normalizes text for accent- and case-insensitive matching: "Bom de BÍBLIA"
 * and "bom de biblia" produce the same value. Stored alongside searchable
 * fields and applied to search input, so adapters only need a plain substring
 * match.
 */
export function normalizeSearchText(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLocaleLowerCase("pt-BR")
		.replace(/\s+/g, " ")
		.trim();
}
