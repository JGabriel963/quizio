import { GAME_PHASES } from "@quizio/core/game/domain/game-progress";
import { MAX_CHOICE_COUNT } from "@quizio/core/quiz/domain/question";
import { z } from "zod";

import { protectedProcedure, publicProcedure, router } from "../index";

// Shapes only: PIN, nickname and ownership rules are enforced by the game use cases.
const gameReference = z.object({ gameId: z.string().min(1) });
const playerReference = gameReference.extend({
	playerId: z.string().min(1),
	secret: z.string().min(1),
});
const questionIndex = z.number().int().min(0);

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
		.input(playerReference)
		.query(({ ctx, input }) => ctx.container.useCases.getPlayerSession(input)),

	/** The time and the correctness are the server's: the device sends only the choice (spec 009, RN-18). */
	answer: publicProcedure
		.input(
			playerReference.extend({
				questionIndex,
				choiceIds: z.array(z.string().min(1).max(32)).max(MAX_CHOICE_COUNT),
			}),
		)
		.mutation(({ ctx, input }) => ctx.container.useCases.submitAnswer(input)),
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

	/** Everything the host's screen shows, in the lobby and during the game. */
	view: protectedProcedure.input(gameReference).query(({ ctx, input }) =>
		ctx.container.useCases.getHostGame({
			ownerId: ctx.session.user.id,
			...input,
		}),
	),

	/** "Iniciar" (spec 009, RN-01). */
	start: protectedProcedure
		// `auto`: autoplay's countdown ran out on the host's screen (spec 014).
		.input(gameReference.extend({ auto: z.boolean().optional() }))
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.startGame({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	/** The host's screen asks for each transition, saying where it is (RN-12). */
	advance: protectedProcedure
		.input(
			gameReference.extend({
				from: z.object({ questionIndex, phase: z.enum(GAME_PHASES) }),
				skip: z.boolean().optional(),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.advanceGame({
				ownerId: ctx.session.user.id,
				...input,
			}),
		),

	/**
	 * The host's screen is there (spec 013, RN-14). A mutation: it is written,
	 * and the screen takes the answer as the proof that it has a connection.
	 */
	signal: protectedProcedure.input(gameReference).mutation(({ ctx, input }) =>
		ctx.container.useCases.signalHost({
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

	/** A switch of "Configurações": only what changes is sent (spec 012, RN-04). */
	setOptions: protectedProcedure
		.input(
			gameReference.extend({
				options: z.object({
					showQuestionsOnDevices: z.boolean().optional(),
					randomizeQuestions: z.boolean().optional(),
					randomizeAnswers: z.boolean().optional(),
					autoplay: z.boolean().optional(),
				}),
			}),
		)
		.mutation(({ ctx, input }) =>
			ctx.container.useCases.setGameOptions({
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
