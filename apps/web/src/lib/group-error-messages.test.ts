import { describe, expect, it } from "vitest";

import {
	groupErrorMessage,
	isGroupNotFound,
	isMembersHidden,
	isNotGroupAdmin,
} from "./group-error-messages";

const failure = (domainCode: string) => ({ data: { domainCode } });

describe("groupErrorMessage (spec 034)", () => {
	it.each([
		["GROUP.INVALID_NAME", "O nome deve ter de 1 a 20 caracteres."],
		["GROUP.NOT_FOUND", "Grupo não encontrado."],
		["GROUP.MEMBER_NOT_FOUND", "Este membro não está mais no grupo."],
		["GROUP.NOT_ADMIN", "Só o administrador do grupo pode fazer isso."],
		[
			"GROUP.ADMIN_CANNOT_LEAVE",
			"O administrador não pode sair do grupo. Exclua o grupo se quiser encerrá-lo.",
		],
		["GROUP.CANNOT_REMOVE_ADMIN", "O administrador não pode ser removido."],
		["GROUP.INVITE_INVALID", "Este convite não é mais válido."],
		["GROUP.INVALID_DESCRIPTION", "A descrição deve ter até 500 caracteres."],
		[
			"GROUP.INVITE_NOT_ALLOWED",
			"O administrador não permite que os membros convidem outras pessoas.",
		],
		["GROUP.MEMBERS_HIDDEN", "O administrador ocultou a lista de membros."],
		["GROUP.INVALID_MESSAGE", "A mensagem deve ter até 500 caracteres."],
		["GROUP.EMPTY_POST", "Escreva um texto ou adicione um anexo."],
		[
			"GROUP.UNSUPPORTED_FILE",
			"Use uma imagem JPG, PNG, GIF ou WebP, ou um arquivo PDF.",
		],
		[
			"GROUP.INVALID_FILE_SIZE",
			"A imagem deve ter até 10 MB, e o PDF, até 20 MB.",
		],
		[
			"GROUP.UPLOAD_NOT_FOUND",
			"Não foi possível encontrar o arquivo. Envie-o de novo.",
		],
		[
			"GROUP.ASSIGN_NOT_ALLOWED",
			"O administrador não permite que os membros atribuam atividades.",
		],
		["GROUP.POST_NOT_FOUND", "Esta publicação não existe mais."],
		[
			"GROUP.POST_DELETE_NOT_ALLOWED",
			"Só quem publicou e o administrador podem excluir a publicação.",
		],
		[
			"GROUP.ASSIGNMENT_NOT_SHAREABLE",
			"Esta atividade não pode mais ser atribuída a grupos.",
		],
		["GROUP.ALREADY_ASSIGNED", "A atividade já foi atribuída a esse grupo."],
	])("maps %s to Portuguese", (code, message) => {
		expect(groupErrorMessage(failure(code))).toBe(message);
	});

	it("falls back for anything else", () => {
		expect(groupErrorMessage(new Error("boom"))).toBe(
			"Não foi possível concluir. Tente novamente.",
		);
	});

	it("tells a missing group apart", () => {
		expect(isGroupNotFound(failure("GROUP.NOT_FOUND"))).toBe(true);
		expect(isGroupNotFound(failure("GROUP.NOT_ADMIN"))).toBe(false);
	});

	it("tells hidden members and not admin apart (spec 035)", () => {
		expect(isMembersHidden(failure("GROUP.MEMBERS_HIDDEN"))).toBe(true);
		expect(isMembersHidden(failure("GROUP.NOT_ADMIN"))).toBe(false);
		expect(isNotGroupAdmin(failure("GROUP.NOT_ADMIN"))).toBe(true);
		expect(isNotGroupAdmin(failure("GROUP.NOT_FOUND"))).toBe(false);
	});
});
