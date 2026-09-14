import { describe, expect, it } from "vitest";

import { authErrorMessage } from "./auth-error-messages";

describe("authErrorMessage", () => {
	it.each([
		[{ code: "INVALID_EMAIL_OR_PASSWORD" }, "E-mail ou senha incorretos."],
		[{ code: "USER_ALREADY_EXISTS" }, "Este e-mail já está em uso."],
		[
			{ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" },
			"Este e-mail já está em uso.",
		],
		[{ code: "INVALID_NAME" }, "O nome deve ter entre 2 e 50 caracteres."],
		[
			{ code: "PASSWORD_TOO_SHORT" },
			"A senha deve ter pelo menos 8 caracteres.",
		],
		[
			{ code: "PASSWORD_TOO_LONG" },
			"A senha deve ter no máximo 128 caracteres.",
		],
		[{ status: 429 }, "Muitas tentativas. Aguarde um pouco e tente novamente."],
		[{ code: "signup_disabled" }, "Novos cadastros estão fechados no momento."],
		[
			{ code: "EMAIL_PASSWORD_SIGN_UP_DISABLED" },
			"Novos cadastros estão fechados no momento.",
		],
	])("maps %o to a Portuguese message", (error, message) => {
		expect(authErrorMessage(error)).toBe(message);
	});

	it("falls back to a generic message for unknown errors", () => {
		expect(authErrorMessage({ code: "SOMETHING_NEW" })).toBe(
			"Não foi possível concluir. Tente novamente.",
		);
		expect(authErrorMessage(undefined)).toBe(
			"Não foi possível concluir. Tente novamente.",
		);
	});
});
