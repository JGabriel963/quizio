import { describe, expect, it } from "vitest";

import { groupTypedAnswers, normalizeTypedAnswer } from "./typed-answer";

describe("normalizeTypedAnswer", () => {
	it("ignores case and accents", () => {
		expect(normalizeTypedAnswer("SÃO Tomé")).toBe(
			normalizeTypedAnswer("sao tome"),
		);
		expect(normalizeTypedAnswer("Açaí")).toBe("acai");
	});

	it("ignores the listed signs", () => {
		expect(normalizeTypedAnswer("Colosseum!")).toBe("colosseum");
		expect(normalizeTypedAnswer("São-Paulo")).toBe(
			normalizeTypedAnswer("São Paulo"),
		);
		expect(normalizeTypedAnswer(`~\`!@#$%^&*(){}[];:"'<,.>?/\\|-_+=a`)).toBe(
			"a",
		);
	});

	it("collapses and trims spaces", () => {
		expect(normalizeTypedAnswer("  SÃO   PAULO! ")).toBe("sao paulo");
	});

	it("drops emojis beside letters or digits", () => {
		expect(normalizeTypedAnswer("São Paulo 🏙️")).toBe("sao paulo");
		expect(normalizeTypedAnswer("👍 42")).toBe("42");
	});

	it("keeps an emoji-only answer", () => {
		expect(normalizeTypedAnswer(" 🍕 ")).toBe("🍕");
		expect(normalizeTypedAnswer("🍕")).not.toBe(normalizeTypedAnswer("🍔"));
	});

	it("an answer of signs only normalizes to empty", () => {
		expect(normalizeTypedAnswer("?!")).toBe("");
		expect(normalizeTypedAnswer("   ")).toBe("");
	});
});

const at = (seconds: number) => new Date(Date.UTC(2026, 9, 21, 12, 0, seconds));

describe("groupTypedAnswers", () => {
	it("groups sent answers by normalized form, named after the first one sent", () => {
		const groups = groupTypedAnswers(
			[],
			[
				{ text: "PEDRA", correct: false, receivedAt: at(3) },
				{ text: "pedra", correct: false, receivedAt: at(1) },
				{ text: "Pedra!", correct: false, receivedAt: at(2) },
			],
		);

		expect(groups).toEqual([
			{
				key: "pedra",
				text: "pedra",
				count: 3,
				correct: false,
				accepted: false,
			},
		]);
	});

	it("accepted answers come first, also with no one sending them", () => {
		const groups = groupTypedAnswers(
			["The Colosseum", "Colosseum", "Colosseum in Rome", "colosseum!"],
			[
				{ text: "colosseum", correct: true, receivedAt: at(1) },
				{ text: "COLOSSEUM", correct: true, receivedAt: at(2) },
			],
		);

		expect(groups).toEqual([
			{
				key: "colosseum",
				text: "Colosseum",
				count: 2,
				correct: true,
				accepted: true,
			},
			{
				key: "the colosseum",
				text: "The Colosseum",
				count: 0,
				correct: true,
				accepted: true,
			},
			{
				key: "colosseum in rome",
				text: "Colosseum in Rome",
				count: 0,
				correct: true,
				accepted: true,
			},
		]);
	});

	it("correct groups come before wrong ones, then by count", () => {
		const groups = groupTypedAnswers(
			["Pedro"],
			[
				{ text: "Paulo", correct: false, receivedAt: at(1) },
				{ text: "Pedra", correct: true, receivedAt: at(2) },
				{ text: "Tiago", correct: false, receivedAt: at(3) },
				{ text: "Tiago", correct: false, receivedAt: at(4) },
			],
		);

		expect(
			groups.map((group) => [group.text, group.count, group.correct]),
		).toEqual([
			["Pedra", 1, true],
			["Pedro", 0, true],
			["Tiago", 2, false],
			["Paulo", 1, false],
		]);
	});
});
