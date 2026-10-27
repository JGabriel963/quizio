/**
 * "Selecionar kahoot" of the Compart. (spec 037, RN-05): Selecionar marks a
 * quiz and a second click takes it back; a quiz already in the group is never
 * marked (RN-04).
 */
export function toggleSharedSelection(
	selected: readonly string[],
	quizId: string,
	alreadyShared: ReadonlySet<string>,
): readonly string[] {
	if (alreadyShared.has(quizId)) {
		return selected;
	}
	return selected.includes(quizId)
		? selected.filter((id) => id !== quizId)
		: [...selected, quizId];
}

/** "Compartilhar 1 kahoot", "Compartilhar 2 kahoots" (capturas 2 e 10). */
export function shareButtonLabel(count: number): string {
	if (count === 0) {
		return "Compartilhar";
	}
	return `Compartilhar ${count} ${count === 1 ? "kahoot" : "kahoots"}`;
}
