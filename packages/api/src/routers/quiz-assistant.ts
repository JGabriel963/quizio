import {
	GENERATION_FORMATS,
	GENERATION_LANGUAGES,
	SKILL_LEVELS,
} from "@quizio/core/quiz/domain/generation";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

// Shapes only: limits, allowed counts and every question rule are the core's.
const quizReference = z.object({ quizId: z.string().min(1) });

const source = z.discriminatedUnion("kind", [
	// A little above the 20,000 graphemes the core allows, which can be more code units.
	z.object({ kind: z.literal("topic"), text: z.string().max(100_000) }),
	z.object({
		kind: z.literal("pdf"),
		key: z.string().min(1),
		pages: z.array(z.number().int()).max(60),
	}),
]);

const options = z.object({
	format: z.enum(GENERATION_FORMATS),
	language: z.enum(GENERATION_LANGUAGES),
	level: z.enum(SKILL_LEVELS),
	count: z.number().int(),
});

/** A created question as the assistant shows it, sent back to be added. */
const generatedQuestion = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("quiz"),
		text: z.string(),
		choices: z
			.array(z.object({ text: z.string(), correct: z.boolean() }))
			.max(16),
	}),
	z.object({
		type: z.literal("trueFalse"),
		text: z.string(),
		correct: z.boolean(),
	}),
]);

/** The creation assistant of the editor (spec 027), mounted as `quiz.assistant`. */
export const quizAssistantRouter = router({
	status: protectedProcedure.query(({ ctx }) =>
		ctx.container.useCases.getAssistantStatus({
			ownerId: ctx.session.user.id,
		}),
	),

	generate: protectedProcedure
		.input(quizReference.extend({ source, options }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.generateQuestions({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	add: protectedProcedure
		.input(
			quizReference.extend({
				questions: z.array(generatedQuestion).max(200),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.addGeneratedQuestions({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),
});
