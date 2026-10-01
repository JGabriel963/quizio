import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";

// Shapes only: PIN, nickname and ownership rules are enforced by the game use cases.
const gameReference = z.object({ gameId: z.string().min(1) });

/**
 * What a player's device calls. No account: the player proves who they are
 * with the pair received when joining (ADR 0009).
 */
const joinRouter = router({
	/** A mutation, because wrong PINs are counted (spec 008, RN-39). */
	find: publicProcedure
		.input(z.object({ pin: z.string().max(16) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.findGameByPin({
				pin: input.pin,
				clientKey: ctx.clientIp,
			}),
		),

	enter: publicProcedure
		.input(gameReference.extend({ nickname: z.string().max(100) }))
		.mutation(({ ctx, input }) => ctx.container.useCases.joinGame(input)),

	session: publicProcedure
		.input(
			gameReference.extend({
				playerId: z.string().min(1),
				secret: z.string().min(1),
			}),
		)
		.query(({ ctx, input }) => ctx.container.useCases.getPlayerSession(input)),
});

export const gameRouter = router({
	join: joinRouter,

	/** "Organizar ao vivo" (spec 008, RN-01 to RN-09). */
	host: protectedProcedure
		.input(z.object({ quizId: z.string().min(1) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.hostGame({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	/** Everything the host's lobby screen shows. */
	lobby: protectedProcedure.input(gameReference).query(({ ctx, input }) =>
		ctx.container.useCases.getHostLobby({
			ownerId: ctx.session.user.id,
			...input,
		}),
	),

	setLocked: protectedProcedure
		.input(gameReference.extend({ locked: z.boolean() }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.setGameLocked({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	removePlayer: protectedProcedure
		.input(gameReference.extend({ playerId: z.string().min(1) }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.removePlayer({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	end: protectedProcedure.input(gameReference).mutation(({ ctx, input }) =>
		ctx.container.useCases.endGame({
			ownerId: ctx.session.user.id,
			...input,
		}),
	),
});
