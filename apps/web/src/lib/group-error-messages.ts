import {
	GROUP_DESCRIPTION_MAX_LENGTH,
	GROUP_NAME_MAX_LENGTH,
} from "@quizio/core/groups/domain/group";

import { GROUP_POST_MESSAGE_MAX_LENGTH } from "@quizio/core/groups/domain/group-post";

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
	"GROUP.INVALID_DESCRIPTION": `A descrição deve ter até ${GROUP_DESCRIPTION_MAX_LENGTH} caracteres.`,
	"GROUP.INVITE_NOT_ALLOWED":
		"O administrador não permite que os membros convidem outras pessoas.",
	"GROUP.MEMBERS_HIDDEN": "O administrador ocultou a lista de membros.",
	"GROUP.INVALID_MESSAGE": `A mensagem deve ter até ${GROUP_POST_MESSAGE_MAX_LENGTH} caracteres.`,
	"GROUP.EMPTY_POST": "Escreva um texto ou adicione um anexo.",
	"GROUP.UNSUPPORTED_FILE":
		"Use uma imagem JPG, PNG, GIF ou WebP, ou um arquivo PDF.",
	"GROUP.INVALID_FILE_SIZE": "A imagem deve ter até 10 MB, e o PDF, até 20 MB.",
	"GROUP.UPLOAD_NOT_FOUND":
		"Não foi possível encontrar o arquivo. Envie-o de novo.",
	"GROUP.ASSIGN_NOT_ALLOWED":
		"O administrador não permite que os membros atribuam atividades.",
	"GROUP.POST_NOT_FOUND": "Esta publicação não existe mais.",
	"GROUP.POST_DELETE_NOT_ALLOWED":
		"Só quem publicou e o administrador podem excluir a publicação.",
	"GROUP.ASSIGNMENT_NOT_SHAREABLE":
		"Esta atividade não pode mais ser atribuída a grupos.",
	"GROUP.ALREADY_ASSIGNED": "A atividade já foi atribuída a esse grupo.",
	"GROUP.SHARE_NOT_ALLOWED": "Você não pode compartilhar neste grupo.",
	"GROUP.QUIZ_NOT_SHAREABLE": "Um dos kahoots não pode mais ser compartilhado.",
	"GROUP.QUIZ_ALREADY_SHARED": "Um dos kahoots já está no grupo.",
	"GROUP.SHARED_QUIZ_NOT_FOUND": "Este quiz não está mais disponível no grupo.",
	"GROUP.UNSHARE_NOT_ALLOWED": "Você não pode remover este kahoot.",
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

/** The admin hid the member list (spec 035, RN-13). */
export function isMembersHidden(error: unknown): boolean {
	return domainCodeOf(error) === "GROUP.MEMBERS_HIDDEN";
}

/** A member asked for the admin's screen (spec 035, RN-02). */
export function isNotGroupAdmin(error: unknown): boolean {
	return domainCodeOf(error) === "GROUP.NOT_ADMIN";
}

/** A shared quiz that left the group, or was never in it (spec 037, RN-25). */
export function isSharedQuizNotFound(error: unknown): boolean {
	return domainCodeOf(error) === "GROUP.SHARED_QUIZ_NOT_FOUND";
}
