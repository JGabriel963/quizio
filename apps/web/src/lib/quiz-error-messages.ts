import {
	CHOICE_TEXT_MAX_LENGTH,
	QUESTION_TEXT_MAX_LENGTH,
} from "@quizio/core/quiz/domain/question";
import { QUIZ_MAX_QUESTIONS } from "@quizio/core/quiz/domain/question-list";
import {
	QUIZ_DESCRIPTION_MAX_LENGTH,
	QUIZ_TITLE_MAX_LENGTH,
} from "@quizio/core/quiz/domain/quiz-details";
import { DomainError } from "@quizio/core/shared/domain/domain-error";

const MESSAGES_BY_DOMAIN_CODE: Record<string, string> = {
	"QUIZ.NOT_FOUND": "Quiz não encontrado.",
	"QUIZ.IN_TRASH": "Este quiz está na lixeira. Restaure-o antes de alterar.",
	"QUIZ.NOT_IN_TRASH": "Mova o quiz para a lixeira antes de excluí-lo.",
	"QUIZ.TITLE_TOO_LONG": `O título deve ter no máximo ${QUIZ_TITLE_MAX_LENGTH} caracteres.`,
	"QUIZ.DESCRIPTION_TOO_LONG": `A descrição deve ter no máximo ${QUIZ_DESCRIPTION_MAX_LENGTH} caracteres.`,
	"QUIZ.INVALID_VISIBILITY": "Escolha uma visibilidade válida.",
	"QUIZ.INVALID_COVER": "Envie a capa novamente.",
	"QUIZ.TITLE_REQUIRED": "Um quiz publicado precisa de título",
	"QUIZ.INCOMPLETE_QUESTIONS":
		"Complete todas as perguntas antes de salvar o quiz.",
	"QUIZ.NOT_PUBLISHED": "Este quiz ainda não foi salvo como jogável.",
	"QUIZ.QUESTION_NOT_FOUND":
		"Esta pergunta não existe mais. Recarregue a página.",
	"QUIZ.QUESTION_TEXT_TOO_LONG": `A pergunta deve ter no máximo ${QUESTION_TEXT_MAX_LENGTH} caracteres.`,
	"QUIZ.QUESTION_LIMIT_REACHED": `Limite de ${QUIZ_MAX_QUESTIONS} perguntas atingido.`,
	"QUIZ.LAST_QUESTION": "Não é possível excluir todo o conteúdo.",
	"QUIZ.INVALID_QUESTION_POSITION":
		"Não foi possível mover a pergunta. Recarregue a página.",
	"QUIZ.CHOICE_TEXT_TOO_LONG": `A resposta deve ter no máximo ${CHOICE_TEXT_MAX_LENGTH} caracteres.`,
	"QUIZ.CHOICE_NOT_FOUND":
		"Esta resposta não existe mais. Recarregue a página.",
	"QUIZ.EMPTY_CHOICE_CORRECT":
		"Escreva a resposta antes de marcá-la como correta.",
	"QUIZ.INVALID_CHOICE_COUNT":
		"Não foi possível recuperar as respostas. Recarregue a página.",
	"QUIZ.INVALID_TIME_LIMIT": "Escolha um limite de tempo da lista.",
	"QUIZ.INVALID_POINTS": "Escolha uma opção de pontos da lista.",
	"QUIZ.INVALID_SELECTION": "Escolha uma opção de resposta da lista.",
	"QUIZ.INVALID_TYPE": "Escolha um tipo de pergunta da lista.",
	"QUIZ.CHANGE_NOT_APPLICABLE":
		"Esta alteração não vale para o tipo da pergunta. Recarregue a página.",
	"QUIZ.INVALID_IMAGE":
		"Não foi possível usar esta imagem. Envie o arquivo de novo.",
	"QUIZ.NO_IMAGE": "Esta pergunta não tem mais imagem.",
	"QUIZ.INVALID_IMAGE_PLACEMENT": "Posição de imagem inválida.",
	"QUIZ.INVALID_IMAGE_CROP": "Recorte de imagem inválido.",
	"QUIZ.IMAGE_ALT_TEXT_TOO_LONG":
		"O texto alternativo pode ter até 1000 caracteres.",
	"MEDIA.UNSUPPORTED_TYPE":
		"Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.",
	"MEDIA.INVALID_SIZE": "Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.",
};

/** The API's `data.domainCode`, or the code of a rule the client applied itself. */
function domainCodeOf(error: unknown): string | null {
	if (error instanceof DomainError) {
		return error.code;
	}
	return typeof error === "object" && error !== null && "data" in error
		? ((error as { data?: { domainCode?: string | null } }).data?.domainCode ??
				null)
		: null;
}

/** A business rule refused the call: resending the same thing fails again. */
export function isDomainRefusal(error: unknown): boolean {
	return domainCodeOf(error) !== null;
}

/** Portuguese message for a failed quiz call, based on its domain code. */
export function quizErrorMessage(error: unknown): string {
	const domainCode = domainCodeOf(error);
	return (
		(domainCode && MESSAGES_BY_DOMAIN_CODE[domainCode]) ??
		"Não foi possível concluir. Tente novamente."
	);
}
