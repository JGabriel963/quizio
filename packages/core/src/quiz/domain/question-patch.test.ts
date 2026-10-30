import { describe, expect, it } from "vitest";

import { type Question, QuestionTextTooLongError } from "./question";
import { questionFromDraft } from "./question-draft";
import { patchedQuestion } from "./question-patch";

const quiz = () =>
	questionFromDraft(
		{
			type: "quiz",
			text: "Capital da França?",
			timeLimitSeconds: 10,
			points: "double",
			choices: [
				{ text: "Paris", correct: true },
				{ text: "Lyon", correct: false },
			],
		},
		"q1",
	);

describe("patchedQuestion (spec 044, RN-21)", () => {
	it("changes only the fields sent and keeps the id and the AI mark", () => {
		const typedByHand = { ...quiz(), aiGenerated: false };

		const patched = patchedQuestion(typedByHand, {
			text: "Capital da Itália?",
			timeLimitSeconds: 30,
		});

		expect(patched).toMatchObject({
			id: "q1",
			text: "Capital da Itália?",
			timeLimitSeconds: 30,
			points: "double",
			aiGenerated: false,
			selection: "single",
		});
		expect(patched.type === "quiz" && patched.choices[0]).toMatchObject({
			text: "Paris",
			correct: true,
		});
	});

	it("new answers without a selection follow how many are correct", () => {
		const patched = patchedQuestion(quiz(), {
			choices: [
				{ text: "2", correct: true },
				{ text: "3", correct: true },
				{ text: "4", correct: false },
			],
		});

		expect(patched).toMatchObject({ selection: "multiple" });
	});

	it("a type change without content starts the new type blank, keeps the statement and fits the time limit", () => {
		const patched = patchedQuestion(quiz(), { type: "puzzle" });

		expect(patched).toMatchObject({
			id: "q1",
			type: "puzzle",
			text: "Capital da França?",
			items: [null, null, null, null],
			timeLimitSeconds: 20,
			points: "double",
		});
	});

	it("a type change with content takes it", () => {
		expect(
			patchedQuestion(quiz(), { type: "trueFalse", correct: false }),
		).toMatchObject({ type: "trueFalse", correct: false });
	});

	it("merges the slider fields sent with the ones it has", () => {
		const slider = questionFromDraft(
			{ type: "slider", text: "?", slider: { min: 0, max: 100, answer: 40 } },
			"s",
		);

		expect(patchedQuestion(slider, { slider: { answer: 60 } })).toMatchObject({
			min: 0,
			max: 100,
			answer: 60,
		});
	});

	it("sets, changes and removes the image with its placement, crop and alt text", () => {
		const withImage = patchedQuestion(quiz(), {
			image: { key: "media/u/a.png", placement: "background", altText: "Mapa" },
		});
		expect(withImage.image).toEqual({
			key: "media/u/a.png",
			placement: "background",
			crop: null,
			altText: "Mapa",
		});

		expect(patchedQuestion(withImage, { text: "Outra" }).image).toEqual(
			withImage.image,
		);
		expect(patchedQuestion(withImage, { image: null }).image).toBeNull();
	});

	it("applies the same limits as a draft", () => {
		expect(() => patchedQuestion(quiz(), { text: "a".repeat(161) })).toThrow(
			QuestionTextTooLongError,
		);
	});

	it("a patch with a text replaces the formatting with the one sent (spec 047, RN-29)", () => {
		const formatted: Question = {
			...quiz(),
			textFormatting: { bold: [[0, 7]] },
		};

		expect(
			patchedQuestion(formatted, {
				text: "Capital da Itália?",
				textFormatting: { italic: [[11, 17]] },
			}).textFormatting,
		).toEqual({ italic: [[11, 17]] });
		expect(
			patchedQuestion(formatted, { text: "Capital da Itália?" }).textFormatting,
		).toEqual({});
	});

	it("a patch without a text keeps text and formatting", () => {
		const formatted: Question = {
			...quiz(),
			textFormatting: { bold: [[0, 7]] },
		};

		const patched = patchedQuestion(formatted, { timeLimitSeconds: 30 });

		expect(patched.text).toBe("Capital da França?");
		expect(patched.textFormatting).toEqual({ bold: [[0, 7]] });
	});
});
