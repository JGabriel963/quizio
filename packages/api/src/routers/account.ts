import { ACCOUNT_DELETION_REASONS } from "@quizio/core/identity/domain/account-deletion";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

/** The creator's account, photo and profile (spec 039; ADR 0019). */
export const accountRouter = router({
	get: protectedProcedure.query(({ ctx }) =>
		ctx.container.useCases.getAccount({ userId: ctx.session.user.id }),
	),

	/** Step 1 of the photo: the browser PUTs the cropped square to this URL. */
	requestPhotoUpload: protectedProcedure
		// Shape only: the media policy in @quizio/core decides what is allowed.
		.input(
			z.object({ contentType: z.string().max(10_000), sizeBytes: z.number() }),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.requestProfilePhotoUpload({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	setPhoto: protectedProcedure
		.input(z.object({ key: z.string().min(1).max(10_000) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.setProfilePhoto({
				userId: ctx.session.user.id,
				key: input.key,
			}),
		),

	removePhoto: protectedProcedure.mutation(({ ctx }) =>
		ctx.container.useCases.removeProfilePhoto({ userId: ctx.session.user.id }),
	),

	delete: protectedProcedure
		.input(
			z.object({
				reason: z.enum(ACCOUNT_DELETION_REASONS),
				feedback: z.string().max(10_000).nullish(),
				confirmation: z.discriminatedUnion("kind", [
					z.object({
						kind: z.literal("password"),
						password: z.string().max(10_000),
					}),
					z.object({ kind: z.literal("email"), email: z.string().max(10_000) }),
				]),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.deleteAccount({
				userId: ctx.session.user.id,
				...input,
			}),
		),

	profile: protectedProcedure
		.input(z.object({ userId: z.string().min(1).max(10_000) }))
		.query(({ ctx, input }) =>
			ctx.container.useCases.getCreatorProfile({
				viewerId: ctx.session.user.id,
				userId: input.userId,
			}),
		),

	publicQuiz: protectedProcedure
		.input(
			z.object({
				userId: z.string().min(1).max(10_000),
				quizId: z.string().min(1).max(10_000),
			}),
		)
		.query(({ ctx, input }) =>
			ctx.container.useCases.getPublicQuiz({
				viewerId: ctx.session.user.id,
				ownerId: input.userId,
				quizId: input.quizId,
			}),
		),
});
