import { describe, expect, it } from "vitest";

import { looksLikeQuestionList } from "./question-source-heuristics";

describe("looksLikeQuestionList", () => {
	it("recognizes a numbered exercise list with lettered answers", () => {
		const page = [
			"Quiz de História Geral",
			"1. Qual civilização antiga desenvolveu a escrita cuneiforme?",
			"a) Maia",
			"b) Fenícia",
			"c) Sumérios",
			"d) Egípcia",
			"Resposta correta: (c)",
			"2. Em que ano caiu o Império Romano do Ocidente?",
			"a) 800 d.C.",
			"b) 27 a.C.",
			"c) 1453 d.C.",
			"d) 476 d.C.",
		].join("\n");

		expect(looksLikeQuestionList([page])).toBe(true);
	});

	it("recognizes (A) to (D) answers across pages, even without line breaks", () => {
		const first =
			"1. Quem liderou a expedição de 1519? (A) Cabral (B) Colombo (C) Vasco da Gama (D) Fernão de Magalhães";
		const second =
			"2. A Revolução Francesa teve início em qual ano? (A) 1848 (B) 1776 (C) 1789 (D) 1815";

		expect(looksLikeQuestionList([first, second])).toBe(true);
	});

	it("recognizes numbered questions without answers", () => {
		const page = [
			"1. O que foi o Muro de Berlim?",
			"2. Qual civilização construiu Machu Picchu?",
			"3. Em que ano terminou a Segunda Guerra Mundial?",
		].join("\n");

		expect(looksLikeQuestionList([page])).toBe(true);
	});

	it("does not take plain prose for questions", () => {
		const page = [
			"O Império Romano do Ocidente caiu em 476 d.C., quando Odoacro depôs Rômulo Augusto.",
			"A queda marcou, para muitos historiadores, o fim da Antiguidade e o início da Idade Média.",
			"Por que isso importa? Porque mudou a organização política da Europa por séculos.",
		].join("\n");

		expect(looksLikeQuestionList([page])).toBe(false);
	});

	it("one question alone is not a list", () => {
		const page = "1. Qual é a capital do Brasil?\na) Rio\nb) Brasília";

		expect(looksLikeQuestionList([page])).toBe(false);
	});

	it("empty pages are not questions", () => {
		expect(looksLikeQuestionList([])).toBe(false);
		expect(looksLikeQuestionList(["", "  "])).toBe(false);
	});
});
