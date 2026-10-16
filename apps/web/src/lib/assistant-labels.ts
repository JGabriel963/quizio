import { SOURCE_MAX_BYTES } from "@quizio/core/media/domain/source-policy";
import {
	GENERATION_MAX_PAGES,
	type GenerationFormat,
	type GenerationLanguage,
	type SkillLevel,
} from "@quizio/core/quiz/domain/generation";
import { QUIZ_MAX_QUESTIONS } from "@quizio/core/quiz/domain/question-list";

/** Texts of the creation assistant (spec 027). */

export const FORMAT_LABELS: Record<GenerationFormat, string> = {
	quiz: "Quiz",
	trueFalse: "Verdadeiro ou falso",
	mixed: "Misto",
	extract: "Extrair perguntas",
};

export const LANGUAGE_LABELS: Record<GenerationLanguage, string> = {
	pt: "Português",
	en: "Inglês",
	es: "Espanhol",
	fr: "Francês",
	de: "Alemão",
	it: "Italiano",
	auto: "Detecção automática",
};

export const LEVEL_LABELS: Record<SkillLevel, string> = {
	beginner: "Iniciante",
	intermediate: "Intermediário",
	advanced: "Avançado",
};

export const TOPIC_SUGGESTIONS = [
	"Sistema solar",
	"Revolução Francesa",
	"Sistema digestivo para crianças",
	"Habilidades animais incríveis",
	"Capitais da América do Sul",
];

export const REVIEW_NOTICE = "Revise as perguntas: a IA pode cometer erros.";
export const PERSONAL_DATA_NOTICE =
	"Os uploads não podem conter dados pessoais";
export const READY_MESSAGE =
	"Suas perguntas estão prontas! Revise-as antes de prosseguir.";
export const NOTHING_USABLE_MESSAGE =
	"Não foi possível criar perguntas com esse conteúdo. Tente outro assunto ou outras páginas.";
export const GENERATION_FAILED_MESSAGE =
	"Não foi possível criar as perguntas agora. Tente de novo.";
export const PAGE_LIMIT_LABEL = `Limite de páginas: ${GENERATION_MAX_PAGES}`;

export function countLabel(count: number): string {
	return `Cerca de ${count} perguntas`;
}

export function remainingLabel(remaining: number): string {
	if (remaining === 0) {
		return "Nenhuma criação restante";
	}
	return remaining === 1 ? "Resta 1 criação" : `Restam ${remaining} criações`;
}

/** RN-32: the time in the browser's own zone. */
export function nextAvailableMessage(
	limit: number,
	nextAvailableAt: Date | string,
): string {
	const time = new Date(nextAvailableAt).toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	});
	return `Você usou as ${limit} criações das últimas 24 horas. A próxima fica disponível às ${time}.`;
}

/** Why the checked questions cannot be added, or null (RN-27). */
export function addLimitReason(
	questionCount: number,
	adding: number,
): string | null {
	const room = Math.max(0, QUIZ_MAX_QUESTIONS - questionCount);
	return adding > room
		? `O quiz tem ${questionCount} perguntas; dá para adicionar até ${room}.`
		: null;
}

/**
 * How many came, when it is fewer than asked; always when extracting, since
 * there was no number asked (RN-22; CA-13).
 */
export function createdMessage({
	count,
	requested,
}: {
	count: number;
	requested: number | null;
}): string | null {
	if (requested === null) {
		return count === 1
			? "Foi extraída 1 pergunta."
			: `Foram extraídas ${count} perguntas.`;
	}
	if (count >= requested) {
		return null;
	}
	return count === 1
		? "Foi criada 1 pergunta."
		: `Foram criadas ${count} perguntas.`;
}

/** Checked before the file is read or sent (RN-13). */
export function pdfFileProblem(file: {
	type: string;
	size: number;
	name: string;
}): string | null {
	const isPdf =
		file.type === "application/pdf" ||
		(file.type === "" && file.name.toLowerCase().endsWith(".pdf"));
	if (!isPdf) {
		return "Envie um arquivo PDF.";
	}
	if (file.size > SOURCE_MAX_BYTES) {
		return "O arquivo passa de 20 MB.";
	}
	return null;
}
