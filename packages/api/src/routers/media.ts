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
});
