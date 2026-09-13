import { DomainError } from "@quizio/core/shared/domain/domain-error";
import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create({
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				domainCode:
					error.cause instanceof DomainError ? error.cause.code : null,
			},
		};
	},
});

export const router = t.router;

export const createCallerFactory = t.createCallerFactory;

/** Business-rule violations are client errors; anything else stays a 500. */
const domainErrorsAsBadRequest = t.middleware(async ({ next }) => {
	const result = await next();
	if (!result.ok && result.error.cause instanceof DomainError) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: result.error.cause.message,
			cause: result.error.cause,
		});
	}
	return result;
});

export const publicProcedure = t.procedure.use(domainErrorsAsBadRequest);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
			cause: "No session",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});
