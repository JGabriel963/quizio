import { QUESTION_TYPES } from "@quizio/core/quiz/domain/question";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

// Shapes only: list rules and text limits are enforced by the quiz use cases.
const quizReference = z.object({ quizId: z.string().min(1) });
const questionReference = quizReference.extend({
	questionId: z.string().min(1),
});
const position = z.number().int().min(0);

/** Question list and autosave of the editor (spec 003), mounted as `quiz.questions`. */
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
				question: z.object({
					id: z.string().min(1),
					type: z.enum(QUESTION_TYPES),
					text: z.string().nullable(),
				}),
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
				changes: z.object({ text: z.string().nullable().optional() }),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.updateQuestion({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),
});
