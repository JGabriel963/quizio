import { describe, expect, it } from "vitest";

import { aQuestion, aTrueFalseQuestion } from "../testing/a-question";
import { blankQuestion, copyQuestion, isBlankQuestion } from "./question";
import { applyQuestionChange } from "./question-change";
import {
	defaultCrop,
	ImageAltTextTooLongError,
	InvalidImageCropError,
	InvalidImagePlacementError,
	newQuestionImage,
	QuestionHasNoImageError,
} from "./question-image";
import { questionIssues } from "./question-issues";
import {
	newQuizVersion,
	parseVersionQuestions,
	sameQuestionLists,
} from "./quiz-version";

const KEY = "media/user-1/ponte.png";
const square = { shape: "square", zoom: 2, x: 0.25, y: 0.75 } as const;
const withImage = aQuestion({ image: newQuestionImage(KEY) });

describe("question image (spec 007)", () => {
	it("a blank question has no image", () => {
		expect(blankQuestion("q").image).toBeNull();
		expect(blankQuestion("q", "trueFalse").image).toBeNull();
	});

	it("a question with only an image is no longer blank", () => {
		expect(isBlankQuestion(blankQuestion("q"))).toBe(true);
		expect(
			isBlankQuestion({ ...blankQuestion("q"), image: newQuestionImage(KEY) }),
		).toBe(false);
	});

	it("a copy has its own image", () => {
		const source = aQuestion({
			image: { ...newQuestionImage(KEY), crop: { ...square } },
		});
		const copy = copyQuestion(source, "copy");

		expect(copy.image).toEqual(source.image);
		expect(copy.image).not.toBe(source.image);
		expect(copy.image?.crop).not.toBe(source.image?.crop);
	});

	it("an image does not complete a question, nor is it required", () => {
		const complete = aQuestion({
			choices: [
				{ id: "choice-1", text: "Brasília", correct: true },
				{ id: "choice-2", text: "Rio", correct: false },
				{ id: "choice-3", text: null, correct: false },
				{ id: "choice-4", text: null, correct: false },
			],
		});
		expect(questionIssues(complete)).toEqual([]);
		expect(questionIssues({ ...withImage, text: null }).length).toBeGreaterThan(
			0,
		);
	});

	describe("changes", () => {
		it("sets a new image in the middle, whole and undescribed", () => {
			const { question, notice } = applyQuestionChange(aQuestion(), {
				kind: "image",
				key: KEY,
			});

			expect(question.image).toEqual(newQuestionImage(KEY));
			expect(notice).toBeNull();
		});

		it("works on a true/false question", () => {
			const { question } = applyQuestionChange(aTrueFalseQuestion(), {
				kind: "image",
				key: KEY,
			});

			expect(question.image?.key).toBe(KEY);
		});

		it("removes the image with its adjustments", () => {
			const adjusted = aQuestion({
				image: {
					key: KEY,
					placement: "background",
					crop: { ...square },
					altText: "Ponte",
				},
			});

			const removed = applyQuestionChange(adjusted, {
				kind: "image",
				key: null,
			}).question;
			const again = applyQuestionChange(removed, {
				kind: "image",
				key: "media/user-1/outra.png",
			}).question;

			expect(removed.image).toBeNull();
			expect(again.image).toEqual(newQuestionImage("media/user-1/outra.png"));
		});

		it("changes the placement and keeps the crop", () => {
			const cropped = aQuestion({
				image: { ...newQuestionImage(KEY), crop: { ...square } },
			});

			const background = applyQuestionChange(cropped, {
				kind: "imagePlacement",
				placement: "background",
			}).question;
			const back = applyQuestionChange(background, {
				kind: "imagePlacement",
				placement: "media",
			}).question;

			expect(background.image).toMatchObject({
				placement: "background",
				crop: square,
			});
			expect(back.image).toEqual(cropped.image);
		});

		it("refuses an unknown placement", () => {
			expect(() =>
				applyQuestionChange(withImage, {
					kind: "imagePlacement",
					placement: "left",
				}),
			).toThrow(InvalidImagePlacementError);
		});

		it("crops", () => {
			const { question } = applyQuestionChange(withImage, {
				kind: "imageCrop",
				crop: { ...square },
			});

			expect(question.image?.crop).toEqual(square);
		});

		it("refuses a crop out of range", () => {
			expect(() =>
				applyQuestionChange(withImage, {
					kind: "imageCrop",
					crop: { ...square, zoom: 4 },
				}),
			).toThrow(InvalidImageCropError);
		});

		it("describes, trims and clears the alt text", () => {
			const described = applyQuestionChange(withImage, {
				kind: "imageAltText",
				altText: "  Ponte ao pôr do sol ",
			}).question;
			const cleared = applyQuestionChange(described, {
				kind: "imageAltText",
				altText: "   ",
			}).question;

			expect(described.image?.altText).toBe("Ponte ao pôr do sol");
			expect(cleared.image?.altText).toBeNull();
		});

		it("refuses an alt text above 1000 characters", () => {
			expect(() =>
				applyQuestionChange(withImage, {
					kind: "imageAltText",
					altText: "a".repeat(1001),
				}),
			).toThrow(ImageAltTextTooLongError);
		});

		it.each([
			{ kind: "imagePlacement", placement: "background" },
			{ kind: "imageCrop", crop: defaultCrop() },
			{ kind: "imageAltText", altText: "Ponte" },
		] as const)("refuses $kind without an image", (change) => {
			expect(() => applyQuestionChange(aQuestion(), change)).toThrow(
				QuestionHasNoImageError,
			);
		});

		it("a type change keeps the image", () => {
			const cropped = aQuestion({
				image: { ...newQuestionImage(KEY), crop: { ...square } },
			});

			const { question } = applyQuestionChange(cropped, {
				kind: "type",
				type: "trueFalse",
				remembered: null,
			});

			expect(question.type).toBe("trueFalse");
			expect(question.image).toEqual(cropped.image);
		});
	});

	describe("in the playable version", () => {
		it("the version keeps a detached copy of the image", () => {
			const version = newQuizVersion({
				quizId: "quiz-1",
				number: 1,
				questions: [withImage],
				now: new Date("2026-06-01T12:00:00.000Z"),
			});

			expect(version.questions[0]?.image).toEqual(withImage.image);
			expect(version.questions[0]?.image).not.toBe(withImage.image);
		});

		it.each([
			["a new image", { ...withImage, image: null }],
			[
				"another file",
				{ ...withImage, image: newQuestionImage("media/user-1/b.png") },
			],
			[
				"the placement",
				{
					...withImage,
					image: { ...newQuestionImage(KEY), placement: "background" as const },
				},
			],
			[
				"the crop",
				{ ...withImage, image: { ...newQuestionImage(KEY), crop: square } },
			],
			[
				"the alt text",
				{ ...withImage, image: { ...newQuestionImage(KEY), altText: "Ponte" } },
			],
		])("%s is a change", (_name, other) => {
			expect(sameQuestionLists([withImage], [other])).toBe(false);
		});

		it("equal images are no change", () => {
			expect(
				sameQuestionLists([withImage], [copyQuestion(withImage, "other-id")]),
			).toBe(true);
		});

		it("reads stored images, and none from older snapshots", () => {
			const stored = JSON.parse(
				JSON.stringify([
					{ ...withImage, image: { ...newQuestionImage(KEY), crop: square } },
				]),
			);
			const { image: _image, ...legacy } = stored[0];

			expect(parseVersionQuestions(stored)[0]?.image).toEqual({
				...newQuestionImage(KEY),
				crop: square,
			});
			expect(parseVersionQuestions([legacy])[0]?.image).toBeNull();
		});
	});
});
