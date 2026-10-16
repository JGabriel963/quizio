import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const mediaRouter = router({
	/** Step 1 of an upload: returns a presigned URL; the browser then PUTs the file to it. */
	requestUpload: protectedProcedure
		// Shape only — the media policy in @quizio/core is the authority on what is allowed.
		.input(z.object({ contentType: z.string(), sizeBytes: z.number() }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.requestMediaUpload({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	/** A PDF for the creation assistant (spec 027): same flow, its own policy and prefix. */
	requestSourceUpload: protectedProcedure
		.input(z.object({ contentType: z.string(), sizeBytes: z.number() }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.requestSourceUpload({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	/** The assistant closed: its PDF goes (spec 027, RN-18). */
	discardSource: protectedProcedure
		.input(z.object({ key: z.string().min(1) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.discardSource({
				ownerId: ctx.session.user.id,
				key: input.key,
			}),
		),
});
