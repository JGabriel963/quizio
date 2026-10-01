import {
	QUESTION_TYPES,
	TIME_LIMITS_SECONDS,
} from "@quizio/core/quiz/domain/question";
import { describe, expect, it } from "vitest";

import {
	answerPlaceholder,
	changeNoticeMessage,
	POINTS_LABELS,
	QUESTION_ISSUE_LABELS,
	SELECTION_LABELS,
	TRUE_FALSE_LABELS,
	timeAppliedMessage,
	timeLimitLabel,
} from "./question-labels";
import { questionTypeLabel } from "./quiz-labels";

describe("question labels", () => {
	it("names every time limit in Portuguese", () => {
		expect(TIME_LIMITS_SECONDS.map(timeLimitLabel)).toEqual([
			"5 segundos",
			"10 segundos",
			"15 segundos",
			"20 segundos",
			"30 segundos",
			"45 segundos",
			"1 minuto",
			"1 minuto 30 segundos",
			"2 minutos",
			"3 minutos",
			"4 minutos",
		]);
	});

	it("names points and answer options", () => {
		expect(POINTS_LABELS).toEqual({
			standard: "Padrão",
			double: "Pontos em dobro",
			noPoints: "Sem pontos",
		});
		expect(SELECTION_LABELS).toEqual({
			single: "Seleção simples",
			multiple: "Múltipla escolha",
		});
	});

	it("explains each incomplete-question issue", () => {
		expect(QUESTION_ISSUE_LABELS).toEqual({
			missingText: "Falta o texto da pergunta",
			notEnoughAnswers: "Adicione pelo menos 2 respostas",
			noCorrectAnswer: "Marque pelo menos 1 resposta correta",
			noCorrectTrueFalse: "Marque a resposta correta",
		});
	});

	it("names the question types and the kept answers notice", () => {
		expect(QUESTION_TYPES.map(questionTypeLabel)).toEqual([
			"Quiz",
			"Verdadeiro ou falso",
		]);
		expect(TRUE_FALSE_LABELS).toEqual({ true: "Verdadeiro", false: "Falso" });
		expect(changeNoticeMessage({ kind: "quizAnswersKept" })).toBe(
			"As respostas do Quiz voltam se você retornar para Quiz antes de sair do editor",
		);
	});

	it("marks answers 3 to 6 as optional", () => {
		expect([0, 1, 2, 3, 4, 5].map(answerPlaceholder)).toEqual([
			"Adicionar resposta 1",
			"Adicionar resposta 2",
			"Adicionar resposta 3 (opcional)",
			"Adicionar resposta 4 (opcional)",
			"Adicionar resposta 5 (opcional)",
			"Adicionar resposta 6 (opcional)",
		]);
	});

	it("words the change notices with singular and plural", () => {
		expect(changeNoticeMessage({ kind: "multipleEnabled" })).toBe(
			"Múltipla escolha ativada",
		);
		expect(changeNoticeMessage({ kind: "correctsCleared", count: 1 })).toBe(
			"1 resposta desmarcada",
		);
		expect(changeNoticeMessage({ kind: "correctsCleared", count: 2 })).toBe(
			"2 respostas desmarcadas",
		);
		expect(timeAppliedMessage(1)).toBe("Tempo aplicado a 1 pergunta");
		expect(timeAppliedMessage(3)).toBe("Tempo aplicado a 3 perguntas");
	});
});
