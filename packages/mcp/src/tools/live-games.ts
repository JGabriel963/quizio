import type { HostGameView } from "@quizio/core/game/application/host-game-view";
import { GAME_MAX_PLAYERS } from "@quizio/core/game/domain/game";
import { z } from "zod";

import { defineTool, type ToolContext } from "../define-tool";
import { WRITTEN_BY_PLAYERS } from "./groups";

const gameId = z
	.string()
	.max(10_000)
	.describe("The game's id, from host_live_game.");

/** What the agent needs of the host's view: no answers, no theme. */
function liveGameOutput(view: HostGameView) {
	return {
		gameId: view.gameId,
		quizId: view.quizId,
		title: view.title,
		pin: view.pin,
		status: view.status,
		endReason: view.endReason,
		locked: view.locked,
		options: view.options,
		players: view.players.map(({ id, nickname }) => ({ id, nickname })),
		questionCount: view.questionCount,
		stage: view.stage
			? { questionIndex: view.stage.questionIndex, phase: view.stage.phase }
			: null,
		standings: view.final?.standings.map(({ rank, nickname, total }) => ({
			rank,
			nickname,
			total,
		})),
	};
}

async function gameAnswer(id: string, context: ToolContext) {
	const view = await context.useCases.getHostGame({
		ownerId: context.identity.userId,
		gameId: id,
	});
	return {
		game: liveGameOutput(view),
		links: {
			hostScreen: context.links.hostScreen(view.gameId),
			join: context.links.join(view.pin),
		},
	};
}

/**
 * The live game up to the lobby (spec 044, RN-26): the agent opens it and
 * looks after the lobby; the host screen starts and drives the questions.
 */
export const liveGameTools = [
	defineTool({
		name: "host_live_game",
		title: "Host a live game",
		description: `Opens a live game of a published quiz (the person's own, one shared in their group, or a public one) and gives its 6-digit PIN, the link players join by and the link of the host screen. Hosting the same quiz again ends this person's previous game of it. Up to ${GAME_MAX_PLAYERS} players. The person must open the host screen and project it: it starts the game and moves through the questions; you cannot.`,
		kind: "write",
		input: z.object({ quizId: z.string().max(10_000) }),
		run: async ({ quizId }, context) => {
			const { gameId: id } = await context.useCases.hostGame({
				ownerId: context.identity.userId,
				quizId,
			});
			return {
				...(await gameAnswer(id, context)),
				reminder:
					"Ask the person to open the host screen and project it: it starts the game and moves through the questions. Until it is open, players see that the host disconnected.",
			};
		},
	}),
	defineTool({
		name: "get_live_game",
		title: "Read a live game",
		description: `The game's state: lobby, playing (with the question and phase on the host screen), finished (with the standings) or ended; the players, the lock and the options. ${WRITTEN_BY_PLAYERS}`,
		kind: "read",
		input: z.object({ gameId }),
		run: async ({ gameId: id }, context) => gameAnswer(id, context),
	}),
	defineTool({
		name: "update_live_game",
		title: "Change a live game",
		description: `Locks or unlocks joining, and turns the game options on or off; send only what changes. The random orders are drawn when the game starts, so they change only in the lobby. Every option except the lock is kept for the person's next games. The open host screen shows the change in a few seconds. ${WRITTEN_BY_PLAYERS}`,
		kind: "idempotent",
		input: z.object({
			gameId,
			locked: z
				.boolean()
				.optional()
				.describe("true stops new players from joining."),
			options: z
				.object({
					showQuestionsOnDevices: z
						.boolean()
						.optional()
						.describe(
							"The statement, image and answer texts also on the players' phones.",
						),
					randomizeQuestions: z.boolean().optional(),
					randomizeAnswers: z.boolean().optional(),
					autoplay: z
						.boolean()
						.optional()
						.describe(
							"The game starts 15 s after the last arrival and moves on by itself; the host screen must still be open.",
						),
					gameCharacters: z
						.boolean()
						.optional()
						.describe("Players get an avatar they may change while waiting."),
				})
				.optional(),
		}),
		run: async ({ gameId: id, locked, options }, context) => {
			const target = { ownerId: context.identity.userId, gameId: id };
			if (locked !== undefined) {
				await context.useCases.setGameLocked({ ...target, locked });
			}
			if (options && Object.values(options).some((on) => on !== undefined)) {
				await context.useCases.setGameOptions({ ...target, options });
			}
			return gameAnswer(id, context);
		},
	}),
	defineTool({
		name: "remove_player",
		title: "Remove a player",
		description: `Takes a player out of the lobby (only before the game starts). They may join again unless joining is locked. Confirm with the person first. ${WRITTEN_BY_PLAYERS}`,
		kind: "destructive",
		input: z.object({
			gameId,
			playerId: z.string().max(10_000).describe("From the game's players."),
		}),
		run: async ({ gameId: id, playerId }, context) => {
			await context.useCases.removePlayer({
				ownerId: context.identity.userId,
				gameId: id,
				playerId,
			});
			return gameAnswer(id, context);
		},
	}),
	defineTool({
		name: "end_live_game",
		title: "End a live game",
		description:
			"Ends the game now for everybody; a game ended before its last question has no podium. A game that started becomes a report. Cannot be undone: confirm with the person first.",
		kind: "destructive",
		input: z.object({ gameId }),
		run: async ({ gameId: id }, context) => {
			await context.useCases.endGame({
				ownerId: context.identity.userId,
				gameId: id,
			});
			return gameAnswer(id, context);
		},
	}),
];
