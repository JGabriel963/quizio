import {
	QUESTION_POINTS,
	QUESTION_TYPES,
	SELECTION_MODES,
} from "@quizio/core/quiz/domain/question";
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
]);

const question = z.object({
	id: z.string().min(1),
	type: z.enum(QUESTION_TYPES),
	text: z.string().nullable(),
	timeLimitSeconds: seconds,
	points: z.enum(QUESTION_POINTS),
	selection: z.enum(SELECTION_MODES),
	choices: z
		.array(z.object({ text: z.string().nullable(), correct: z.boolean() }))
		.max(16),
});

/** Question list and autosave of the editor (specs 003, 004), mounted as `quiz.questions`. */
export const quizQuestionsRouter = router({
	add: protectedProcedure
		.input(
			quizReference.extend({ afterQuestionId: z.string().min(1).nullable() }),
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

	restore: protectedProcedure
		.input(
			quizReference.extend({
				question,
				index: position,
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.restoreQuestion({
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
