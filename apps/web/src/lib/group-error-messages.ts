import { GROUP_NAME_MAX_LENGTH } from "@quizio/core/groups/domain/group";

import { domainCodeOf } from "./quiz-error-messages";

const MESSAGES_BY_DOMAIN_CODE: Record<string, string> = {
	"GROUP.INVALID_NAME": `O nome deve ter de 1 a ${GROUP_NAME_MAX_LENGTH} caracteres.`,
	"GROUP.NOT_FOUND": "Grupo não encontrado.",
	"GROUP.MEMBER_NOT_FOUND": "Este membro não está mais no grupo.",
	"GROUP.NOT_ADMIN": "Só o administrador do grupo pode fazer isso.",
	"GROUP.ADMIN_CANNOT_LEAVE":
		"O administrador não pode sair do grupo. Exclua o grupo se quiser encerrá-lo.",
	"GROUP.CANNOT_REMOVE_ADMIN": "O administrador não pode ser removido.",
	"GROUP.INVITE_INVALID": "Este convite não é mais válido.",
};

/** Portuguese message for a failed group call, based on its domain code (spec 034). */
export function groupErrorMessage(
	error: unknown,
	fallback = "Não foi possível concluir. Tente novamente.",
): string {
	const domainCode = domainCodeOf(error);
	return (domainCode && MESSAGES_BY_DOMAIN_CODE[domainCode]) ?? fallback;
}

/** Missing, or a group the user is not in: both look the same (RN-05). */
export function isGroupNotFound(error: unknown): boolean {
	return domainCodeOf(error) === "GROUP.NOT_FOUND";
}
