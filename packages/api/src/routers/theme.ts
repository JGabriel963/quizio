import { BACKGROUND_PATTERN_IDS } from "@quizio/core/shared/domain/theme-look";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const color = z.string().max(16);
const fileKey = z.string().min(1).max(256);

/** Shape only: the core checks the name, the colors' legibility and the files. */
const look = z.object({
	background: z.discriminatedUnion("kind", [
		z.object({
			kind: z.literal("pattern"),
			pattern: z.enum(BACKGROUND_PATTERN_IDS),
			color,
		}),
		z.object({
			kind: z.literal("image"),
			key: fileKey,
			tone: z.enum(["dark", "light"]),
		}),
	]),
	accentColor: color,
	logoKey: fileKey.nullable(),
});

const themeReference = z.object({ themeId: z.string().min(1).max(64) });

/** "Seus temas" and "Crie seu tema" (spec 043; ADR 0022). */
export const themeRouter = router({
	list: protectedProcedure.query(({ ctx }) =>
		ctx.container.useCases.listCustomThemes({ ownerId: ctx.session.user.id }),
	),

	create: protectedProcedure
		.input(z.object({ name: z.string().max(200), look }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.createCustomTheme({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	update: protectedProcedure
		.input(themeReference.extend({ name: z.string().max(200), look }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.updateCustomTheme({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	delete: protectedProcedure.input(themeReference).mutation(({ ctx, input }) =>
		ctx.container.useCases.deleteCustomTheme({
			ownerId: ctx.session.user.id,
			...input,
		}),
	),

	/** A logo or a background: a presigned PUT, then the key goes with the theme. */
	requestUpload: protectedProcedure
		.input(z.object({ contentType: z.string(), sizeBytes: z.number() }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.requestThemeUpload({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	/** Cancelar, Remover or the X: an upload no theme took goes. */
	discardUpload: protectedProcedure
		.input(z.object({ key: fileKey }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.discardThemeUpload({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),
});
