import { describe, expect, it } from "vitest";

import {
	averageTimeLabel,
	durationLabel,
	percentLabel,
	playedQuestionsLabel,
	RESULT_LABELS,
	reportDateLabel,
	responseTimeLabel,
	summaryHeadline,
	unansweredLabel,
} from "./report-labels";

describe("report labels (spec 015)", () => {
	it("picks the sentence by band", () => {
		expect(summaryHeadline(100)).toBe("Excelente resultado!");
		expect(summaryHeadline(80)).toBe("Excelente resultado!");
		expect(summaryHeadline(79)).toBe("Bom trabalho!");
		expect(summaryHeadline(50)).toBe("Bom trabalho!");
		expect(summaryHeadline(49)).toBe("A prática leva à perfeição!");
		expect(summaryHeadline(0)).toBe("A prática leva à perfeição!");
	});

	it("formats minutes and 'menos de 1 min'", () => {
		expect(durationLabel(11 * 60_000 + 30_000)).toBe("11 min");
		expect(durationLabel(60_000)).toBe("1 min");
		expect(durationLabel(40_000)).toBe("menos de 1 min");
		expect(durationLabel(0)).toBe("menos de 1 min");
	});

	it("formats the average time in seconds", () => {
		expect(averageTimeLabel(4860)).toBe("4,86 s");
		expect(averageTimeLabel(5000)).toBe("5,00 s");
		expect(averageTimeLabel(null)).toBe("—");
	});

	it("formats one answer's time", () => {
		expect(responseTimeLabel(3200)).toBe("3,2 s");
		expect(responseTimeLabel(12_040)).toBe("12,0 s");
		expect(responseTimeLabel(null)).toBe("—");
	});

	it("formats the date as in the list", () => {
		expect(reportDateLabel("2026-06-13T17:45:00.000Z", "UTC")).toBe(
			"13 de jun. de 2026, 17:45",
		);
		// In the device's zone by default.
		expect(
			reportDateLabel("2026-06-13T17:45:00.000Z", "America/Sao_Paulo"),
		).toBe("13 de jun. de 2026, 14:45");
	});

	it("names each result", () => {
		expect(RESULT_LABELS).toEqual({
			correct: "Correta",
			partiallyCorrect: "Parcialmente correta",
			wrong: "Incorreta",
			unanswered: "Sem resposta",
		});
	});

	it("shows a dash without a percent", () => {
		expect(percentLabel(38)).toBe("38%");
		expect(percentLabel(0)).toBe("0%");
		expect(percentLabel(null)).toBe("—");
	});

	it("tells played of total when the game ended early", () => {
		expect(playedQuestionsLabel(15, 15)).toBe("15");
		expect(playedQuestionsLabel(7, 15)).toBe("7 de 15");
	});

	it("counts the unanswered questions", () => {
		expect(unansweredLabel(1)).toBe("1 pergunta sem resposta");
		expect(unansweredLabel(2)).toBe("2 perguntas sem resposta");
	});
});
