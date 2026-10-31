import { describe, expect, it } from "vitest";
import { asPuzzle, asQuiz } from "../testing/a-question";
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

	it("a patch with choices replaces their formatting with the one sent (spec 048, RN-23)", () => {
		const formatted = patchedQuestion(quiz(), {
			choices: [
				{ text: "Paris", textFormatting: { bold: [[0, 5]] }, correct: true },
				{ text: "Lyon", correct: false },
			],
		});
		expect(asQuiz(formatted).choices[0]?.textFormatting).toEqual({
			bold: [[0, 5]],
		});

		const replaced = patchedQuestion(formatted, {
			choices: [
				{ text: "Paris", correct: true },
				{ text: "Lyon", correct: false },
			],
		});
		expect(asQuiz(replaced).choices[0]?.textFormatting).toEqual({});

		const puzzle = patchedQuestion(quiz(), {
			type: "puzzle",
			items: ["H2O", "Sal", "Ar"],
			itemFormatting: [{ subscript: [[1, 2]] }],
		});
		expect(
			asPuzzle(patchedQuestion(puzzle, { items: ["H2O", "Sal", "Ar"] }))
				.itemFormatting,
		).toEqual([{}, {}, {}, {}]);
	});

	it("a patch without answers keeps them with their formatting", () => {
		const formatted = patchedQuestion(quiz(), {
			choices: [
				{ text: "Paris", textFormatting: { bold: [[0, 5]] }, correct: true },
				{ text: "Lyon", correct: false },
			],
		});
		const puzzle = patchedQuestion(quiz(), {
			type: "puzzle",
			items: ["H2O", "Sal", "Ar"],
			itemFormatting: [{ subscript: [[1, 2]] }],
		});

		expect(
			asQuiz(patchedQuestion(formatted, { timeLimitSeconds: 30 })).choices[0]
				?.textFormatting,
		).toEqual({ bold: [[0, 5]] });
		expect(
			asPuzzle(patchedQuestion(puzzle, { text: "Ordene de novo" }))
				.itemFormatting[0],
		).toEqual({ subscript: [[1, 2]] });
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

describe("answer images in patches (spec 049, RN-21)", () => {
	const image = { key: "media/ana/arroz.png", crop: null, altText: null };

	it("choices sent replace the images too, and other fields keep them", () => {
		const withImage = patchedQuestion(quiz(), {
			choices: [
				{ text: null, image, correct: true },
				{ text: "Lyon", correct: false },
			],
		});
		expect(asQuiz(withImage).choices[0]?.image).toEqual(image);

		const renamed = patchedQuestion(withImage, { text: "Outra pergunta?" });
		expect(asQuiz(renamed).choices[0]?.image).toEqual(image);

		const replaced = patchedQuestion(withImage, {
			choices: [
				{ text: "Paris", correct: true },
				{ text: "Lyon", correct: false },
			],
		});
		expect(asQuiz(replaced).choices[0]?.image).toBeNull();
	});

	it("puzzle items sent replace the images, and other fields keep them", () => {
		const puzzle = questionFromDraft(
			{
				type: "puzzle",
				text: "Ordem?",
				items: [null, "Dois", "Três"],
				itemImages: [image],
			},
			"q2",
		);
		expect(
			asPuzzle(patchedQuestion(puzzle, { points: "double" })).itemImages[0],
		).toEqual(image);
		expect(
			asPuzzle(patchedQuestion(puzzle, { items: ["Um", "Dois", "Três"] }))
				.itemImages,
		).toEqual([null, null, null, null]);
	});
});
