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
