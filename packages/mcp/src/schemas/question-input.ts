import {
	ANSWER_CROP_SHAPES,
	type AnswerImage,
} from "@quizio/core/quiz/domain/answer-image";
import {
	CHOICE_TEXT_MAX_LENGTH,
	MAX_ACCEPTED_ANSWERS,
	MAX_CHOICE_COUNT,
	PUZZLE_ITEM_COUNT,
	QUESTION_POINTS,
	QUESTION_TEXT_MAX_LENGTH,
	QUESTION_TYPES,
	type Question,
	SELECTION_MODES,
	SLIDER_UNIT_MAX_LENGTH,
	TYPE_ANSWER_MAX_LENGTH,
	timeLimitsFor,
} from "@quizio/core/quiz/domain/question";
import type { QuestionDraft } from "@quizio/core/quiz/domain/question-draft";
import {
	CROP_SHAPES,
	IMAGE_ALT_TEXT_MAX_LENGTH,
	IMAGE_PLACEMENTS,
} from "@quizio/core/quiz/domain/question-image";
import { questionIssues } from "@quizio/core/quiz/domain/question-issues";
import type { QuestionPatch } from "@quizio/core/quiz/domain/question-patch";
import { ANSWER_MARGINS } from "@quizio/core/shared/domain/slider-scale";
import { z } from "zod";

import type { ToolContext } from "../define-tool";
import { fileSource, resolveFile } from "./file-source";
import {
	answersFromMarkup,
	questionMarkup,
	statementFromMarkup,
	TEXT_MARKUP_HELP,
} from "./text-markup";

const timeLimits = QUESTION_TYPES.map(
	(type) => `${type}: ${timeLimitsFor(type).join(", ")}`,
).join("; ");

const imageInput = z
	.object({
		source: fileSource,
		placement: z
			.enum(IMAGE_PLACEMENTS)
			.optional()
			.describe(
				"media (in the middle, the default) or background (behind the whole question).",
			),
		altText: z
			.string()
			.max(10_000)
			.nullish()
			.describe(
				`A description for screen readers, up to ${IMAGE_ALT_TEXT_MAX_LENGTH} characters.`,
			),
		crop: z
			.object({
				shape: z.enum(CROP_SHAPES),
				zoom: z.number().describe("1 to 3."),
				x: z.number().describe("0 to 1; 0.5 is centered."),
				y: z.number().describe("0 to 1; 0.5 is centered."),
			})
			.nullish(),
	})
	.describe("The question's image, of any type.");

/** An answer shown as an image instead of text (spec 049, RN-27). */
const answerImageInput = z
	.object({
		source: fileSource,
		altText: z
			.string()
			.max(10_000)
			.nullish()
			.describe(
				`A description for screen readers, up to ${IMAGE_ALT_TEXT_MAX_LENGTH} characters.`,
			),
		crop: z
			.object({
				shape: z.enum(ANSWER_CROP_SHAPES),
				zoom: z.number().describe("1 to 3."),
				x: z.number().describe("0 to 1; 0.5 is centered."),
				y: z.number().describe("0 to 1; 0.5 is centered."),
			})
			.nullish(),
	})
	.describe(
		"An image in place of the answer's text: send text null with it, never both.",
	);

const questionShape = {
	type: z
		.enum(QUESTION_TYPES)
		.describe(
			"quiz (choose answers), trueFalse, typeAnswer (typed), slider (a number on a scale) or puzzle (put in order).",
		),
	text: z
		.string()
		.max(10_000)
		.nullish()
		.describe(
			`The statement, up to ${QUESTION_TEXT_MAX_LENGTH} characters. ${TEXT_MARKUP_HELP}`,
		),
	timeLimitSeconds: z
		.number()
		.int()
		.optional()
		.describe(
			`Seconds to answer, from the type's list (${timeLimits}). Each type has a default.`,
		),
	points: z
		.enum(QUESTION_POINTS)
		.optional()
		.describe("standard (1000, the default), double (2000) or noPoints."),
	image: imageInput.nullish(),
	choices: z
		.array(
			z.object({
				text: z
					.string()
					.max(10_000)
					.nullable()
					.describe(
						`Up to ${CHOICE_TEXT_MAX_LENGTH} characters, with the statement's tags; null with an image.`,
					),
				image: answerImageInput.nullish(),
				correct: z.boolean(),
			}),
		)
		.max(16)
		.optional()
		.describe(
			`quiz only: 2 to ${MAX_CHOICE_COUNT} answers, at least one correct.`,
		),
	selection: z
		.enum(SELECTION_MODES)
		.optional()
		.describe(
			"quiz only: single or multiple; multiple when more than one answer is correct, by default.",
		),
	correct: z
		.boolean()
		.nullish()
		.describe("trueFalse only: whether the statement is true."),
	acceptedAnswers: z
		.array(z.string().max(10_000).nullable())
		.max(8)
		.optional()
		.describe(
			`typeAnswer only: 1 to ${MAX_ACCEPTED_ANSWERS} answers of up to ${TYPE_ANSWER_MAX_LENGTH} characters; case, accents and punctuation are ignored when comparing.`,
		),
	slider: z
		.object({
			min: z.number().nullish(),
			max: z.number().nullish(),
			answer: z.number().nullish(),
			unit: z
				.string()
				.max(10_000)
				.nullish()
				.describe(
					`Up to ${SLIDER_UNIT_MAX_LENGTH} characters, shown under the number.`,
				),
			answerMargin: z
				.enum(ANSWER_MARGINS)
				.optional()
				.describe(
					"How far from the answer still counts as almost correct; medium by default.",
				),
		})
		.optional()
		.describe(
			"slider only: numbers with up to 2 decimals; the answer between min and max. An answer alone gets a range around it.",
		),
	items: z
		.array(z.string().max(10_000).nullable())
		.max(8)
		.optional()
		.describe(
			`puzzle only: 3 or ${PUZZLE_ITEM_COUNT} texts of up to ${CHOICE_TEXT_MAX_LENGTH} characters, with the statement's tags, top to bottom in the right order; null where itemImages has an image.`,
		),
	itemImages: z
		.array(answerImageInput.nullable())
		.max(4)
		.optional()
		.describe(
			"puzzle only: an image per position in place of its text, aligned with items; replaced whole with items.",
		),
};

/** A whole question of any type (spec 044, RN-21). */
export const questionInput = z.object(questionShape);

/** The fields to change; the others stay as they are. */
export const questionChanges = z.object({
	...questionShape,
	type: questionShape.type
		.optional()
		.describe(
			"A new type: without its answers, they start blank and the statement stays.",
		),
	image: imageInput.nullish().describe("A new image, or null to remove it."),
});

type QuestionInput = z.infer<typeof questionInput>;
type QuestionChangesInput = z.infer<typeof questionChanges>;

async function imageDraft(
	image: QuestionInput["image"],
	context: ToolContext,
): Promise<QuestionDraft["image"]> {
	if (!image) {
		return image;
	}
	return {
		key: await resolveFile(image.source, { kind: "media" }, context),
		placement: image.placement,
		altText: image.altText,
		crop: image.crop,
	};
}

type AnswerImageInput = z.infer<typeof answerImageInput>;

async function answerImageDraft(
	image: AnswerImageInput | null | undefined,
	context: ToolContext,
) {
	return image
		? {
				key: await resolveFile(image.source, { kind: "media" }, context),
				altText: image.altText,
				crop: image.crop,
			}
		: null;
}

/** The answers' images with their files in storage (spec 049, RN-27). */
async function answerImagesDraft(
	input: Pick<QuestionInput, "choices" | "itemImages">,
	context: ToolContext,
): Promise<Pick<QuestionDraft, "choices" | "itemImages">> {
	const markup = answersFromMarkup(input);
	return {
		...(markup.choices &&
			input.choices && {
				choices: await Promise.all(
					markup.choices.map(async (choice, index) => ({
						...choice,
						image: await answerImageDraft(
							input.choices?.[index]?.image,
							context,
						),
					})),
				),
			}),
		...(input.itemImages && {
			itemImages: await Promise.all(
				input.itemImages.map((image) => answerImageDraft(image, context)),
			),
		}),
	};
}

/** The draft the core checks, with the image's file in storage. */
export async function toQuestionDraft(
	input: QuestionInput,
	context: ToolContext,
): Promise<QuestionDraft> {
	const { choices: _choices, itemImages: _itemImages, ...rest } = input;
	return {
		...rest,
		...statementFromMarkup(input.text),
		...answersFromMarkup(input),
		...(await answerImagesDraft(input, context)),
		image: await imageDraft(input.image, context),
	};
}

export async function toQuestionPatch(
	input: QuestionChangesInput,
	context: ToolContext,
): Promise<QuestionPatch> {
	const { image, text, ...rest } = input;
	const { choices: _choices, itemImages: _itemImages, ...fields } = rest;
	const changes = {
		...fields,
		...statementFromMarkup(text),
		...answersFromMarkup(rest),
		...(await answerImagesDraft(rest, context)),
	};
	return image === undefined
		? changes
		: { ...changes, image: await imageDraft(image, context) };
}

/** A question as the agent reads it: where it is and what it still needs. */
export function questionOutput(
	question: Question,
	position: number,
	imageUrls: Record<string, string> = {},
) {
	const answerImage = (image: AnswerImage | null) =>
		image && { ...image, url: imageUrls[image.key] ?? null };
	const read = questionMarkup(question);
	const markedChoices = ("choices" in read ? read.choices : []) as object[];
	return {
		...read,
		// The answers' images with their address (spec 049, RN-26).
		...(question.type === "quiz" && {
			choices: question.choices.map((choice, index) => ({
				...markedChoices[index],
				image: answerImage(choice.image),
			})),
		}),
		...(question.type === "puzzle" && {
			itemImages: question.itemImages.map(answerImage),
		}),
		position,
		issues: questionIssues(question),
		...(question.image
			? { imageUrl: imageUrls[question.image.key] ?? null }
			: {}),
	};
}
