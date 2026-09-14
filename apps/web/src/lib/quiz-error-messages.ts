import {
	QUIZ_DESCRIPTION_MAX_LENGTH,
	QUIZ_TITLE_MAX_LENGTH,
} from "@quizio/core/quiz/domain/quiz-details";

const MESSAGES_BY_DOMAIN_CODE: Record<string, string> = {
	"QUIZ.NOT_FOUND": "Quiz não encontrado.",
	"QUIZ.IN_TRASH": "Este quiz está na lixeira. Restaure-o antes de alterar.",
	"QUIZ.NOT_IN_TRASH": "Mova o quiz para a lixeira antes de excluí-lo.",
	"QUIZ.TITLE_TOO_LONG": `O título deve ter no máximo ${QUIZ_TITLE_MAX_LENGTH} caracteres.`,
	"QUIZ.DESCRIPTION_TOO_LONG": `A descrição deve ter no máximo ${QUIZ_DESCRIPTION_MAX_LENGTH} caracteres.`,
	"QUIZ.INVALID_VISIBILITY": "Escolha uma visibilidade válida.",
	"QUIZ.INVALID_COVER": "Envie a capa novamente.",
	"MEDIA.UNSUPPORTED_TYPE":
		"Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.",
	"MEDIA.INVALID_SIZE": "Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.",
};

/** Portuguese message for a failed quiz call, based on the API's `data.domainCode`. */
export function quizErrorMessage(error: unknown): string {
	const domainCode =
		typeof error === "object" && error !== null && "data" in error
			? (error as { data?: { domainCode?: string | null } }).data?.domainCode
			: null;
	return (
		(domainCode && MESSAGES_BY_DOMAIN_CODE[domainCode]) ??
		"Não foi possível concluir. Tente novamente."
	);
}
