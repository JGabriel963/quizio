import { LIBRARY_SECTIONS } from "@quizio/core/library/domain/library-section";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export const libraryRouter = router({
	list: protectedProcedure
		.input(
			z.object({
				section: z.enum(LIBRARY_SECTIONS),
				search: z.string().max(200).optional(),
			}),
		)
		.query(({ ctx, input }) =>
			ctx.container.useCases.listLibrary({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),
});
