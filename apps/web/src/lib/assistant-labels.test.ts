import { describe, expect, it } from "vitest";

import {
	addLimitReason,
	countLabel,
	createdMessage,
	creditsUsedLabel,
	estimateLabel,
	nextAvailableMessage,
	notEnoughCreditsReason,
	pdfFileProblem,
	remainingLabel,
} from "./assistant-labels";

describe("assistant labels", () => {
	it("nextAvailableMessage tells when the next credits come back (spec 045, RN-16)", () => {
		const nextAt = new Date(2026, 9, 16, 9, 10);

		expect(nextAvailableMessage(20, nextAt)).toBe(
			"Você usou os 20 créditos das últimas 24 horas. Os próximos voltam às 09:10.",
		);
		expect(nextAvailableMessage(50, nextAt.toISOString())).toContain(
			"os 50 créditos",
		);
	});

	it("remainingLabel counts credits", () => {
		expect(remainingLabel(5)).toBe("Restam 5 créditos");
		expect(remainingLabel(1)).toBe("Resta 1 crédito");
		expect(remainingLabel(0)).toBe("Nenhum crédito restante");
	});

	it("estimateLabel says up to N credits, singular for 1 (spec 045, RN-06)", () => {
		expect(estimateLabel(4)).toBe("Esta criação usa até 4 créditos");
		expect(estimateLabel(1)).toBe("Esta criação usa até 1 crédito");
	});

	it("notEnoughCreditsReason tells what it needs and what is left (spec 045, RN-08)", () => {
		expect(notEnoughCreditsReason(9, 4)).toBe(
			"Esta criação precisa de até 9 créditos e restam 4. Escolha menos páginas ou menos perguntas.",
		);
		expect(notEnoughCreditsReason(2, 1)).toBe(
			"Esta criação precisa de até 2 créditos e resta 1. Escolha menos páginas ou menos perguntas.",
		);
	});

	it("creditsUsedLabel tells what the creation used (spec 045, RN-09)", () => {
		expect(creditsUsedLabel(1)).toBe("Esta criação usou 1 crédito.");
		expect(creditsUsedLabel(3)).toBe("Esta criação usou 3 créditos.");
	});

	it("explains how many questions still fit", () => {
		expect(addLimitReason(195, 5)).toBeNull();
		expect(addLimitReason(195, 10)).toBe(
			"O quiz tem 195 perguntas; dá para adicionar até 5.",
		);
		expect(addLimitReason(200, 1)).toBe(
			"O quiz tem 200 perguntas; dá para adicionar até 0.",
		);
	});

	it("tells how many came", () => {
		expect(createdMessage({ count: 8, requested: 10 })).toBe(
			"Foram criadas 8 perguntas.",
		);
		expect(createdMessage({ count: 1, requested: 5 })).toBe(
			"Foi criada 1 pergunta.",
		);
		expect(createdMessage({ count: 10, requested: 10 })).toBeNull();
		expect(createdMessage({ count: 11, requested: null })).toBe(
			"Foram extraídas 11 perguntas.",
		);
	});

	it("labels the duration", () => {
		expect(countLabel(20)).toBe("Cerca de 20 perguntas");
	});

	it("checks a file before reading it", () => {
		expect(
			pdfFileProblem({ type: "application/pdf", size: 1000, name: "a.pdf" }),
		).toBeNull();
		expect(
			pdfFileProblem({ type: "image/png", size: 1000, name: "a.png" }),
		).toBe("Envie um arquivo PDF.");
		expect(
			pdfFileProblem({
				type: "application/pdf",
				size: 20 * 1024 * 1024 + 1,
				name: "a.pdf",
			}),
		).toBe("O arquivo passa de 20 MB.");
	});
});
