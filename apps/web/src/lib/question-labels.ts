import type {
	QuestionPoints,
	SelectionMode,
} from "@quizio/core/quiz/domain/question";
import type { QuestionChangeNotice } from "@quizio/core/quiz/domain/question-change";
import type { QuestionIssue } from "@quizio/core/quiz/domain/question-issues";

/** PT-BR labels of the question editor (spec 004). */

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

export const QUESTION_ISSUE_LABELS: Record<QuestionIssue, string> = {
	missingText: "Falta o texto da pergunta",
	notEnoughAnswers: "Adicione pelo menos 2 respostas",
	noCorrectAnswer: "Marque pelo menos 1 resposta correta",
};

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
	}
}

export function timeAppliedMessage(count: number): string {
	return `Tempo aplicado a ${plural(count, "pergunta", "perguntas")}`;
}
