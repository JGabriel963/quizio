import { z } from "zod";

import { protectedProcedure, router } from "../index";

const notificationCursor = z.object({
	at: z.iso
		.datetime({ offset: true })
		.max(64)
		.transform((value) => new Date(value)),
	id: z.string().min(1).max(300),
});

/** The bell and its panel (spec 040; ADR 0020). */
export const notificationRouter = router({
	summary: protectedProcedure.query(({ ctx }) =>
		ctx.container.useCases.getInboxSummary({ userId: ctx.session.user.id }),
	),

	list: protectedProcedure
		// The panel asks for the next 20 as it scrolls, from a cursor, with no
		// limit on how far back it goes (RN-13).
		.input(z.object({ cursor: notificationCursor.optional() }))
		.query(async ({ ctx, input }) => {
			const { nextCursor, ...page } =
				await ctx.container.useCases.listNotifications({
					userId: ctx.session.user.id,
					cursor: input.cursor,
				});
			return {
				...page,
				nextCursor: nextCursor && {
					at: nextCursor.at.toISOString(),
					id: nextCursor.id,
				},
			};
		}),

	seen: protectedProcedure.mutation(({ ctx }) =>
		ctx.container.useCases.markInboxSeen({ userId: ctx.session.user.id }),
	),

	read: protectedProcedure
		.input(z.object({ id: z.string().min(1).max(300) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.markNotificationRead({
				userId: ctx.session.user.id,
				notificationId: input.id,
			}),
		),

	readAll: protectedProcedure.mutation(({ ctx }) =>
		ctx.container.useCases.markAllNotificationsRead({
			userId: ctx.session.user.id,
		}),
	),
});
