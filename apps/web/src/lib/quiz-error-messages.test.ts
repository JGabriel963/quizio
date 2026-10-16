import { describe, expect, it } from "vitest";

import { quizErrorMessage } from "./quiz-error-messages";

const refusal = (domainCode: string) => ({ data: { domainCode } });

describe("quizErrorMessage", () => {
	it.each([
		[
			"QUIZ.GENERATION_FAILED",
			"Não foi possível criar as perguntas agora. Tente de novo.",
		],
		[
			"QUIZ.GENERATION_UNAVAILABLE",
			"A criação com IA não está disponível nesta instância.",
		],
		["QUIZ.GENERATION_TOPIC_EMPTY", "Escreva sobre o que será o quiz."],
		[
			"QUIZ.GENERATION_TOPIC_TOO_LONG",
			"O texto pode ter até 20000 caracteres.",
		],
		["QUIZ.SOURCE_ENCRYPTED", "Esse PDF está protegido por senha."],
		["QUIZ.SOURCE_INVALID", "Não foi possível abrir esse PDF."],
		["QUIZ.SOURCE_NOT_FOUND", "Envie o PDF de novo."],
		["QUIZ.INVALID_SOURCE_PAGES", "Escolha de 1 a 50 páginas do arquivo."],
		["MEDIA.UNSUPPORTED_SOURCE_TYPE", "Envie um arquivo PDF."],
		["MEDIA.INVALID_SOURCE_SIZE", "O arquivo passa de 20 MB."],
	])("maps the assistant code %s to Portuguese", (code, message) => {
		expect(quizErrorMessage(refusal(code))).toBe(message);
	});
});
