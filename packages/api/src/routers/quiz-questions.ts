import {
	QUESTION_POINTS,
	QUESTION_TYPES,
	SELECTION_MODES,
} from "@quizio/core/quiz/domain/question";
import {
	CROP_SHAPES,
	IMAGE_PLACEMENTS,
} from "@quizio/core/quiz/domain/question-image";
import { ANSWER_MARGINS } from "@quizio/core/shared/domain/slider-scale";
import { TEXT_MARKS } from "@quizio/core/shared/domain/text-formatting";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

// Shapes only: list rules and text limits are enforced by the quiz use cases.
const quizReference = z.object({ quizId: z.string().min(1).max(10_000) });
const questionReference = quizReference.extend({
	questionId: z.string().min(1).max(10_000),
});
const position = z.number().int().min(0);
const seconds = z.number().int();
const choiceId = z.string().min(1).max(10_000);

const textOffset = z.number().int().min(0).max(10_000);

const crop = z.object({
	shape: z.enum(CROP_SHAPES),
	zoom: z.number(),
	x: z.number(),
	y: z.number(),
});

/** An answer's image as the editor sends it back in a type change (spec 049). */
const answerImage = z.object({
	key: z.string().min(1).max(10_000),
	crop: crop.nullable(),
	altText: z.string().max(10_000).nullable(),
});

/** Which answer an image change is about: a quiz choice or a puzzle slot (spec 049). */
const answerRef = z.union([
	z.object({ choiceId: z.string().min(1).max(10_000) }),
	z.object({ slot: z.number().int().min(0).max(3) }),
]);
/**
 * A text's marked stretches as the editor sends them (spec 047): known marks
 * only, each a list of [start, end) pairs. Whether they fit the text is the
 * core's to say.
 */
export const textFormattingInput = z.partialRecord(
	z.enum(TEXT_MARKS),
	z.array(z.tuple([textOffset, textOffset])).max(400),
);

/** The type-specific part of a question, as clients send it back in a type change (spec 005). */
const content = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("quiz"),
		selection: z.enum(SELECTION_MODES),
		choices: z
			.array(
				z.object({
					text: z.string().max(10_000).nullable(),
					// Spec 048: without it, the answer comes back with none.
					textFormatting: textFormattingInput.default(() => ({})),
					image: answerImage.nullable().default(null),
					correct: z.boolean(),
				}),
			)
			.max(16),
	}),
	z.object({ type: z.literal("trueFalse"), correct: z.boolean().nullable() }),
	z.object({
		type: z.literal("typeAnswer"),
		acceptedAnswers: z.array(z.string().max(200).nullable()).max(8),
	}),
	z.object({
		type: z.literal("slider"),
		min: z.number().finite().nullable(),
		max: z.number().finite().nullable(),
		answer: z.number().finite().nullable(),
		unit: z.string().max(200).nullable(),
		answerMargin: z.enum(ANSWER_MARGINS),
	}),
	z.object({
		type: z.literal("puzzle"),
		items: z.array(z.string().max(300).nullable()).max(4),
		itemFormatting: z
			.array(textFormattingInput)
			.max(4)
			.default(() => []),
		itemImages: z
			.array(answerImage.nullable())
			.max(4)
			.default(() => []),
	}),
]);
/** An accepted answer's position; how many there may be is the core's (spec 031). */
const acceptedAnswerIndex = z.number().int().min(0).max(7);
/** One of a puzzle's four slots (spec 033, RN-03). */
const puzzleSlot = z.number().int().min(0).max(3);

const change = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("text"),
		text: z.string().max(10_000).nullable(),
		// A tab still on the version before spec 047 sends none.
		formatting: textFormattingInput.default(() => ({})),
	}),
	z.object({ kind: z.literal("timeLimit"), seconds }),
	z.object({ kind: z.literal("points"), points: z.enum(QUESTION_POINTS) }),
	z.object({
		kind: z.literal("selection"),
		selection: z.enum(SELECTION_MODES),
	}),
	z.object({
		kind: z.literal("choiceText"),
		choiceId,
		text: z.string().max(10_000).nullable(),
		// A tab still on the version before spec 048 sends none.
		formatting: textFormattingInput.default(() => ({})),
	}),
	z.object({
		kind: z.literal("choiceCorrect"),
		choiceId,
		correct: z.boolean(),
	}),
	z.object({ kind: z.literal("extraChoices"), visible: z.boolean() }),
	z.object({ kind: z.literal("trueFalseCorrect"), correct: z.boolean() }),
	z.object({
		kind: z.literal("acceptedAnswerText"),
		index: acceptedAnswerIndex,
		text: z.string().max(200).nullable(),
	}),
	z.object({ kind: z.literal("acceptedAnswerAdded") }),
	// A slider's number as typed; its 10 characters and decimals are the core's (spec 032).
	z.object({
		kind: z.literal("sliderNumber"),
		field: z.enum(["min", "max", "answer"]),
		value: z.string().max(20).nullable(),
	}),
	z.object({
		kind: z.literal("sliderUnit"),
		text: z.string().max(200).nullable(),
	}),
	z.object({ kind: z.literal("answerMargin"), margin: z.enum(ANSWER_MARGINS) }),
	// A puzzle's slot text, whose 75 characters are the core's, and a move (spec 033).
	z.object({
		kind: z.literal("puzzleItemText"),
		index: puzzleSlot,
		text: z.string().max(300).nullable(),
		formatting: textFormattingInput.default(() => ({})),
	}),
	z.object({
		kind: z.literal("puzzleItemMoved"),
		from: puzzleSlot,
		to: puzzleSlot,
	}),
	z.object({
		kind: z.literal("acceptedAnswerRemoved"),
		index: acceptedAnswerIndex,
	}),
	z.object({
		kind: z.literal("type"),
		type: z.enum(QUESTION_TYPES),
		remembered: content.nullable(),
	}),
	// Spec 007: the image key comes from `media.requestUpload`.
	z.object({
		kind: z.literal("image"),
		key: z.string().min(1).max(10_000).nullable(),
	}),
	z.object({
		kind: z.literal("imagePlacement"),
		placement: z.enum(IMAGE_PLACEMENTS),
	}),
	z.object({ kind: z.literal("imageCrop"), crop }),
	z.object({
		kind: z.literal("imageAltText"),
		altText: z.string().max(10_000).nullable(),
	}),
	// Spec 049: an answer's image; the key comes from `media.requestUpload`.
	z.object({
		kind: z.literal("answerImage"),
		answer: answerRef,
		key: z.string().min(1).max(10_000).nullable(),
	}),
	z.object({ kind: z.literal("answerImageCrop"), answer: answerRef, crop }),
	z.object({
		kind: z.literal("answerImageAltText"),
		answer: answerRef,
		altText: z.string().max(10_000).nullable(),
	}),
]);

/** Question list and autosave of the editor (specs 003 to 005), mounted as `quiz.questions`. */
export const quizQuestionsRouter = router({
	add: protectedProcedure
		.input(
			quizReference.extend({
				afterQuestionId: z.string().min(1).max(10_000).nullable(),
				type: z.enum(QUESTION_TYPES),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.addQuestion({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	duplicate: protectedProcedure
		.input(questionReference)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.duplicateQuestion({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	move: protectedProcedure
		.input(questionReference.extend({ toIndex: position }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.moveQuestion({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	delete: protectedProcedure
		.input(questionReference)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.deleteQuestion({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	update: protectedProcedure
		.input(
			questionReference.extend({
				change,
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.updateQuestion({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	applyTimeLimitToAll: protectedProcedure
		.input(quizReference.extend({ seconds }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.applyTimeLimitToAll({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),
});
