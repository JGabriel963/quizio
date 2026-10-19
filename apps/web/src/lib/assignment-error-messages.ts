import { gameErrorMessage } from "./game-error-messages";
import { domainCodeOf } from "./quiz-error-messages";

/** Why "Mover para a lixeira" is not available on an open assignment (spec 029, RN-41). */
export const ASSIGNMENT_OPEN_TRASH_HINT =
	"Encerre a atribuição para mover o relatório para a lixeira.";

const DEADLINE_CODES = [
	"ASSIGNMENT.DEADLINE_PASSED",
	"ASSIGNMENT.DEADLINE_TOO_FAR",
];

/**
 * The maximum is the instance's (RN-08): the dialog knows it from the setup,
 * so the server's refusal only repeats what the calendar already kept.
 */
function messageOf(domainCode: string | null, maxDays: number): string | null {
	switch (domainCode) {
		case "ASSIGNMENT.DEADLINE_PASSED":
			return "Esse prazo já passou. Escolha outro.";
		case "ASSIGNMENT.DEADLINE_TOO_FAR":
			return `O prazo pode ser de no máximo ${maxDays} dias a partir de agora.`;
		case "GAME.ENDED":
			return "Esta atribuição já foi encerrada.";
		default:
			return null;
	}
}

/** Portuguese message for a failed assignment call (spec 029, RN-17, RN-43). */
export function assignmentErrorMessage(
	error: unknown,
	fallback?: string,
	maxDays = 28,
): string {
	const domainCode = domainCodeOf(error);
	const own = messageOf(domainCode, maxDays);
	if (own) {
		return own;
	}
	if (domainCode === null && fallback) {
		return fallback;
	}
	return gameErrorMessage(error);
}

/** The deadline was refused: the dialog stays open and says why on its card (RN-17). */
export function isDeadlineRefusal(error: unknown): boolean {
	const domainCode = domainCodeOf(error);
	return domainCode !== null && DEADLINE_CODES.includes(domainCode);
}
