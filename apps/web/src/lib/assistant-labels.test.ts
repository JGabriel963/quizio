import { describe, expect, it } from "vitest";

import {
	addLimitReason,
	countLabel,
	createdMessage,
	nextAvailableMessage,
	pdfFileProblem,
	remainingLabel,
} from "./assistant-labels";

describe("assistant labels", () => {
	it("formats the next available time", () => {
		const nextAt = new Date(2026, 9, 16, 9, 10);

		expect(nextAvailableMessage(20, nextAt)).toBe(
			"Você usou as 20 criações das últimas 24 horas. A próxima fica disponível às 09:10.",
		);
		expect(nextAvailableMessage(50, nextAt.toISOString())).toContain(
			"as 50 criações",
		);
	});

	it("tells the remaining uses", () => {
		expect(remainingLabel(5)).toBe("Restam 5 criações");
		expect(remainingLabel(1)).toBe("Resta 1 criação");
		expect(remainingLabel(0)).toBe("Nenhuma criação restante");
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
