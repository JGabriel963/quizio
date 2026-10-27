import { z } from "zod";

import { protectedProcedure, router } from "../index";

/** The bell and its panel (spec 040; ADR 0020). */
export const notificationRouter = router({
	summary: protectedProcedure.query(({ ctx }) =>
		ctx.container.useCases.getInboxSummary({ userId: ctx.session.user.id }),
	),

	list: protectedProcedure
		// The panel asks for 20 more as it scrolls (RN-13).
		.input(z.object({ limit: z.number().int().min(1).max(200).optional() }))
		.query(({ ctx, input }) =>
			ctx.container.useCases.listNotifications({
				userId: ctx.session.user.id,
				limit: input.limit,
			}),
		),

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
