import { DomainError } from "@quizio/core/shared/domain/domain-error";
import { NotFoundError } from "@quizio/core/shared/domain/not-found-error";
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

/**
 * Business-rule violations are client errors: "not found" (including other
 * owners' resources) becomes NOT_FOUND, the rest BAD_REQUEST. Anything that
 * is not a DomainError stays a 500.
 */
const domainErrorsAsClientErrors = t.middleware(async ({ next }) => {
	const result = await next();
	if (!result.ok && result.error.cause instanceof DomainError) {
		const cause = result.error.cause;
		throw new TRPCError({
			code: cause instanceof NotFoundError ? "NOT_FOUND" : "BAD_REQUEST",
			message: cause.message,
			cause,
		});
	}
	return result;
});

export const publicProcedure = t.procedure.use(domainErrorsAsClientErrors);

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
