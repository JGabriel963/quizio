import { REPORT_SECTIONS } from "@quizio/core/reports/domain/report";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const gameId = z.string().min(1).max(100);
/** One action for the selected reports (spec 015, RN-29). */
const gameIds = z.object({ gameIds: z.array(gameId).min(1).max(200) });

/** A creator's reports: every procedure is for who is signed in (RN-03). */
export const reportRouter = router({
	list: protectedProcedure
		.input(
			z.object({
				section: z.enum(REPORT_SECTIONS),
				search: z.string().max(200).optional(),
				limit: z.number().int().min(1).max(200),
			}),
		)
		.query(({ ctx, input }) =>
			ctx.container.useCases.listReports({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	get: protectedProcedure.input(z.object({ gameId })).query(({ ctx, input }) =>
		ctx.container.useCases.getReport({
			ownerId: ctx.session.user.id,
			...input,
		}),
	),

	participant: protectedProcedure
		.input(z.object({ gameId, playerId: z.string().min(1).max(100) }))
		.query(({ ctx, input }) =>
			ctx.container.useCases.getReportParticipant({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	question: protectedProcedure
		.input(z.object({ gameId, questionIndex: z.number().int().min(0) }))
		.query(({ ctx, input }) =>
			ctx.container.useCases.getReportQuestion({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	rename: protectedProcedure
		// The length is the domain's rule, counted in characters (RN-46).
		.input(z.object({ gameId, name: z.string().max(1000) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.renameReport({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	moveToTrash: protectedProcedure.input(gameIds).mutation(({ ctx, input }) =>
		ctx.container.useCases.moveReportsToTrash({
			ownerId: ctx.session.user.id,
			...input,
		}),
	),

	restore: protectedProcedure.input(gameIds).mutation(({ ctx, input }) =>
		ctx.container.useCases.restoreReports({
			ownerId: ctx.session.user.id,
			...input,
		}),
	),

	deletePermanently: protectedProcedure
		.input(gameIds)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.deleteReportsPermanently({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),
});
