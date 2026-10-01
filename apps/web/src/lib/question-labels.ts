import type {
	QuestionPoints,
	SelectionMode,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChangeNotice } from "@quizio/core/quiz/domain/question-change";
import {
	missingAnswerCount,
	type QuestionIssue,
} from "@quizio/core/quiz/domain/question-issues";

import type { QuestionData } from "./api-types";

/** PT-BR labels of the question editor (specs 004 to 006). */

function plural(count: number, singular: string, pluralForm: string): string {
	return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** "20 segundos", "1 minuto 30 segundos", "2 minutos" (RN-10). */
export function timeLimitLabel(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	const parts = [
		minutes > 0 && plural(minutes, "minuto", "minutos"),
		rest > 0 && plural(rest, "segundo", "segundos"),
	];
	return parts.filter(Boolean).join(" ");
}

export const POINTS_LABELS: Record<QuestionPoints, string> = {
	standard: "Padrão",
	double: "Pontos em dobro",
	noPoints: "Sem pontos",
};

export const SELECTION_LABELS: Record<SelectionMode, string> = {
	single: "Seleção simples",
	multiple: "Múltipla escolha",
};

/**
 * Why a question is incomplete, in Kahoot's words: the list alert and the
 * "Não é possível jogar este quiz" dialog show the same reasons (spec 006, RN-10a).
 */
export function questionIssueLabel(
	question: QuestionData,
	issue: QuestionIssue,
): string {
	switch (issue) {
		case "missingText":
			return "Pergunta ausente";
		case "notEnoughAnswers":
			return `${plural(missingAnswerCount(question), "resposta", "respostas")} faltando`;
		case "noCorrectAnswer":
		case "noCorrectTrueFalse":
			return "Resposta correta não selecionada";
	}
}

/** The hints beside the answers of a question without a correct one (spec 004, RN-16; spec 005, RN-12). */
export const NO_CORRECT_ANSWER_HINT = "Marque pelo menos 1 resposta correta";
export const NO_CORRECT_TRUE_FALSE_HINT = "Marque a resposta correta";

/** The two fixed answers of a true/false question (spec 005, RN-06). */
export const TRUE_FALSE_LABELS = {
	true: "Verdadeiro",
	false: "Falso",
} as const;

/** The hints beside the fields of a question the creator came back to (spec 004, RN-16). */
export const MISSING_QUESTION_TEXT_HINT = "Nenhuma pergunta foi adicionada.";

export function missingAnswerHint(position: number): string {
	return `A resposta ${position} não foi adicionada`;
}

/** Answers 1 and 2 are required, the others optional (RN-02). */
export function answerPlaceholder(index: number): string {
	const label = `Adicionar resposta ${index + 1}`;
	return index < 2 ? label : `${label} (opcional)`;
}

export function changeNoticeMessage(notice: QuestionChangeNotice): string {
	switch (notice.kind) {
		case "multipleEnabled":
			return "Múltipla escolha ativada";
		case "correctsCleared":
			return plural(
				notice.count,
				"resposta desmarcada",
				"respostas desmarcadas",
			);
		case "quizAnswersKept":
			return "As respostas do Quiz voltam se você retornar para Quiz antes de sair do editor";
	}
}

export function timeAppliedMessage(count: number): string {
	return `Tempo aplicado a ${plural(count, "pergunta", "perguntas")}`;
}
