import type { QuestionType } from "@quizio/core/quiz/domain/question";

/** Shared quiz labels in PT-BR, used by the library, the quiz page, the dashboard and the editor. */
export function questionCountLabel(count: number): string {
	return `${count} ${count === 1 ? "pergunta" : "perguntas"}`;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
	quiz: "Quiz",
};

export function questionTypeLabel(type: QuestionType): string {
	return QUESTION_TYPE_LABELS[type];
}
