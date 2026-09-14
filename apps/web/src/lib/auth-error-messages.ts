import {
	CREATOR_NAME_LENGTH,
	PASSWORD_LENGTH,
} from "@quizio/core/identity/domain/sign-up-rules";

export interface AuthErrorLike {
	code?: string | null;
	status?: number | null;
}

const GENERIC_MESSAGE = "Não foi possível concluir. Tente novamente.";

const MESSAGES_BY_CODE: Record<string, string> = {
	// Same message for unknown email and wrong password (spec 001, RN-06).
	INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
	USER_ALREADY_EXISTS: "Este e-mail já está em uso.",
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Este e-mail já está em uso.",
	INVALID_EMAIL: "Informe um e-mail válido.",
	INVALID_NAME: `O nome deve ter entre ${CREATOR_NAME_LENGTH.min} e ${CREATOR_NAME_LENGTH.max} caracteres.`,
	PASSWORD_TOO_SHORT: `A senha deve ter pelo menos ${PASSWORD_LENGTH.min} caracteres.`,
	PASSWORD_TOO_LONG: `A senha deve ter no máximo ${PASSWORD_LENGTH.max} caracteres.`,
};

/** Portuguese message for a Better Auth error, or a generic one when unknown. */
export function authErrorMessage(
	error: AuthErrorLike | null | undefined,
): string {
	if (!error) {
		return GENERIC_MESSAGE;
	}
	if (error.status === 429) {
		return "Muitas tentativas. Aguarde um pouco e tente novamente.";
	}
	const code = error.code ?? "";
	// Email sign-up answers EMAIL_PASSWORD_SIGN_UP_DISABLED; Google redirects with ?error=signup_disabled.
	if (/sign_?up_?disabled/i.test(code)) {
		return "Novos cadastros estão fechados no momento.";
	}
	return MESSAGES_BY_CODE[code.toUpperCase()] ?? GENERIC_MESSAGE;
}
