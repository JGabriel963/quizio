import { QUIZ_VISIBILITIES } from "@quizio/core/quiz/domain/quiz-details";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

// Shapes only: limits and cover ownership are enforced by the quiz use cases.
const quizReference = z.object({ quizId: z.string().min(1) });

const coverChange = z.discriminatedUnion("type", [
	z.object({ type: z.literal("keep") }),
	z.object({ type: z.literal("remove") }),
	z.object({ type: z.literal("set"), key: z.string().min(1) }),
]);

export const quizRouter = router({
	get: protectedProcedure.input(quizReference).query(({ ctx, input }) =>
		ctx.container.useCases.getQuizDetails({
			ownerId: ctx.session.user.id,
			...input,
		}),
	),

	create: protectedProcedure
		.input(
			z.object({
				title: z.string().nullish(),
				description: z.string().nullish(),
				visibility: z.enum(QUIZ_VISIBILITIES).optional(),
				coverImageKey: z.string().nullish(),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.createQuiz({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	updateDetails: protectedProcedure
		.input(
			quizReference.extend({
				title: z.string().nullable(),
				description: z.string().nullable(),
				visibility: z.enum(QUIZ_VISIBILITIES),
				cover: coverChange,
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.updateQuizDetails({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	duplicate: protectedProcedure
		.input(quizReference)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.duplicateQuiz({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	moveToTrash: protectedProcedure
		.input(quizReference)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.moveQuizToTrash({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	restore: protectedProcedure.input(quizReference).mutation(({ ctx, input }) =>
		ctx.container.useCases.restoreQuiz({
			ownerId: ctx.session.user.id,
			...input,
		}),
	),

	deletePermanently: protectedProcedure
		.input(quizReference)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.deleteQuizPermanently({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),
});
