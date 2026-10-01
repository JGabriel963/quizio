import { NICKNAME_MAX_LENGTH } from "@quizio/core/game/domain/nickname";

import { domainCodeOf } from "./quiz-error-messages";

/** What the player's device shows after the host removes them (spec 008, RN-29). */
export const REMOVED_FROM_GAME_MESSAGE = "Ah, não! Você foi expulso do jogo.";

/** Shown to the players of a game that was ended (RN-32). */
export const GAME_ENDED_MESSAGE = "O anfitrião encerrou o jogo.";

const MESSAGES_BY_DOMAIN_CODE: Record<string, string> = {
	"GAME.NOT_FOUND": "Partida não encontrada.",
	"GAME.QUIZ_NOT_FOUND": "Quiz não encontrado.",
	"GAME.QUIZ_NOT_PLAYABLE": "Salve o quiz no editor para poder jogar.",
	"GAME.PIN_NOT_RECOGNIZED":
		"Não foi possível reconhecer o PIN do jogo. Verifique-o e tente de novo.",
	"GAME.TOO_MANY_PIN_ATTEMPTS":
		"Muitas tentativas. Aguarde um momento e tente de novo.",
	"GAME.LOCKED":
		"Este jogo está bloqueado. Peça ao anfitrião para desbloquear.",
	"GAME.FULL": "Este jogo está cheio.",
	"GAME.INVALID_NICKNAME": `O apelido deve ter de 1 a ${NICKNAME_MAX_LENGTH} caracteres.`,
	"GAME.NICKNAME_TAKEN": "Esse apelido já está em uso. Escolha outro.",
	"GAME.ENDED": "Esta partida foi encerrada.",
};

/** The `GAME.*` code of a failed call, or null for anything else. */
export function gameErrorCode(error: unknown): string | null {
	return domainCodeOf(error);
}

/** Portuguese message for a failed game call, based on its domain code. */
export function gameErrorMessage(error: unknown): string {
	const domainCode = domainCodeOf(error);
	return (
		(domainCode && MESSAGES_BY_DOMAIN_CODE[domainCode]) ??
		"Não foi possível concluir. Tente novamente."
	);
}
