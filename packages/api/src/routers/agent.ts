import { z } from "zod";

import { protectedProcedure, router } from "../index";

/** Configurações › Agentes de IA (spec 044, RN-12 to RN-16). */
export const agentRouter = router({
	/** The server's address, the connected agents and the access keys. */
	access: protectedProcedure.query(async ({ ctx }) => ({
		serverUrl: ctx.container.mcpServerUrl,
		...(await ctx.container.useCases.listAgentAccess({
			ownerId: ctx.session.user.id,
		})),
	})),

	/** Criar chave: the secret comes back here and never again (RN-05). */
	createKey: protectedProcedure
		// Shape only: the 1 to 50 characters are the core's.
		.input(z.object({ name: z.string().max(200) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.createAccessKey({
				ownerId: ctx.session.user.id,
				name: input.name,
			}),
		),

	revokeKey: protectedProcedure
		.input(z.object({ keyId: z.string().min(1).max(10_000) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.revokeAccessKey({
				ownerId: ctx.session.user.id,
				keyId: input.keyId,
			}),
		),

	disconnect: protectedProcedure
		.input(z.object({ connectionId: z.string().min(1).max(10_000) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.disconnectAgent({
				ownerId: ctx.session.user.id,
				connectionId: input.connectionId,
			}),
		),
});
