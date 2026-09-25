/** Shared quiz labels in PT-BR, used by the library, the quiz page and the dashboard. */
export function questionCountLabel(count: number): string {
	return `${count} ${count === 1 ? "pergunta" : "perguntas"}`;
}
