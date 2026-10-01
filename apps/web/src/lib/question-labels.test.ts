import {
	blankQuestion,
	QUESTION_TYPES,
	TIME_LIMITS_SECONDS,
} from "@quizio/core/quiz/domain/question";
import { describe, expect, it } from "vitest";

import {
	answerPlaceholder,
	changeNoticeMessage,
	NO_CORRECT_ANSWER_HINT,
	NO_CORRECT_TRUE_FALSE_HINT,
	POINTS_LABELS,
	questionIssueLabel,
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

	it("uses Kahoot's reason texts", () => {
		const quiz = blankQuestion("q");
		const trueFalse = blankQuestion("t", "trueFalse");

		expect(questionIssueLabel(quiz, "missingText")).toBe("Pergunta ausente");
		expect(questionIssueLabel(quiz, "notEnoughAnswers")).toBe(
			"2 respostas faltando",
		);
		expect(questionIssueLabel(quiz, "noCorrectAnswer")).toBe(
			"Resposta correta não selecionada",
		);
		expect(questionIssueLabel(trueFalse, "noCorrectTrueFalse")).toBe(
			"Resposta correta não selecionada",
		);
	});

	it("1 resposta faltando", () => {
		const oneAnswer = {
			...blankQuestion("q"),
			choices: blankQuestion("q").choices.map((choice, index) =>
				index === 2 ? { ...choice, text: "Rio" } : choice,
			),
		};

		expect(questionIssueLabel(oneAnswer, "notEnoughAnswers")).toBe(
			"1 resposta faltando",
		);
	});

	it("keeps the hints beside the answers", () => {
		expect(NO_CORRECT_ANSWER_HINT).toBe("Marque pelo menos 1 resposta correta");
		expect(NO_CORRECT_TRUE_FALSE_HINT).toBe("Marque a resposta correta");
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
