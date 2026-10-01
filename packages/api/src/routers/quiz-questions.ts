import {
	QUESTION_POINTS,
	QUESTION_TYPES,
	SELECTION_MODES,
} from "@quizio/core/quiz/domain/question";
import {
	CROP_SHAPES,
	IMAGE_PLACEMENTS,
} from "@quizio/core/quiz/domain/question-image";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

// Shapes only: list rules and text limits are enforced by the quiz use cases.
const quizReference = z.object({ quizId: z.string().min(1) });
const questionReference = quizReference.extend({
	questionId: z.string().min(1),
});
const position = z.number().int().min(0);
const seconds = z.number().int();
const choiceId = z.string().min(1);

/** The type-specific part of a question, as clients send it back in a type change (spec 005). */
const content = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("quiz"),
		selection: z.enum(SELECTION_MODES),
		choices: z
			.array(z.object({ text: z.string().nullable(), correct: z.boolean() }))
			.max(16),
	}),
	z.object({ type: z.literal("trueFalse"), correct: z.boolean().nullable() }),
]);

const change = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("text"), text: z.string().nullable() }),
	z.object({ kind: z.literal("timeLimit"), seconds }),
	z.object({ kind: z.literal("points"), points: z.enum(QUESTION_POINTS) }),
	z.object({
		kind: z.literal("selection"),
		selection: z.enum(SELECTION_MODES),
	}),
	z.object({
		kind: z.literal("choiceText"),
		choiceId,
		text: z.string().nullable(),
	}),
	z.object({
		kind: z.literal("choiceCorrect"),
		choiceId,
		correct: z.boolean(),
	}),
	z.object({ kind: z.literal("extraChoices"), visible: z.boolean() }),
	z.object({ kind: z.literal("trueFalseCorrect"), correct: z.boolean() }),
	z.object({
		kind: z.literal("type"),
		type: z.enum(QUESTION_TYPES),
		remembered: content.nullable(),
	}),
	// Spec 007: the image key comes from `media.requestUpload`.
	z.object({ kind: z.literal("image"), key: z.string().min(1).nullable() }),
	z.object({
		kind: z.literal("imagePlacement"),
		placement: z.enum(IMAGE_PLACEMENTS),
	}),
	z.object({
		kind: z.literal("imageCrop"),
		crop: z.object({
			shape: z.enum(CROP_SHAPES),
			zoom: z.number(),
			x: z.number(),
			y: z.number(),
		}),
	}),
	z.object({ kind: z.literal("imageAltText"), altText: z.string().nullable() }),
]);

/** Question list and autosave of the editor (specs 003 to 005), mounted as `quiz.questions`. */
export const quizQuestionsRouter = router({
	add: protectedProcedure
		.input(
			quizReference.extend({
				afterQuestionId: z.string().min(1).nullable(),
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
