import { describe, expect, it } from "vitest";

import { DomainError } from "../../shared/domain/domain-error";
import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { aPlayer } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createAdvanceGame } from "./advance-game";
import { createChangeAvatar } from "./change-avatar";
import { createCreateAssignment } from "./create-assignment";
import { createEndGame } from "./end-game";
import { createEndGamesOfQuiz } from "./end-games-of-quiz";
import { createGetHostGame } from "./get-host-game";
import { createGetPlayerSession } from "./get-player-session";
import { createHostGame } from "./host-game";
import { createJoinGame } from "./join-game";
import { createRemovePlayer } from "./remove-player";
import { createSetGameLocked } from "./set-game-locked";
import { createSetGameOptions } from "./set-game-options";
import { createSignalHost } from "./signal-host";
import { createStartGame } from "./start-game";
import { createSubmitAnswer } from "./submit-answer";

type Deps = ReturnType<typeof createGameDeps>;

/** An open assignment of quiz-1, with one participant. */
async function withAssignment() {
	const deps = createGameDeps();
	const { gameId } = await createCreateAssignment(deps)({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: new Date(deps.clock.now().getTime() + 24 * 60 * 60 * 1000),
		options: DEFAULT_ASSIGNMENT_OPTIONS,
	});
	await deps.players.save(aPlayer({ gameId }));
	return { deps, gameId };
}

const player = { playerId: "player-1", secret: "secret-1" };

const liveUseCases: [
	string,
	(deps: Deps, gameId: string) => Promise<unknown>,
][] = [
	[
		"getHostGame",
		(deps, gameId) => createGetHostGame(deps)({ ownerId: "user-1", gameId }),
	],
	[
		"startGame",
		(deps, gameId) => createStartGame(deps)({ ownerId: "user-1", gameId }),
	],
	[
		"advanceGame",
		(deps, gameId) =>
			createAdvanceGame(deps)({
				ownerId: "user-1",
				gameId,
				from: { questionIndex: 0, phase: "answering" },
			}),
	],
	[
		"setGameLocked",
		(deps, gameId) =>
			createSetGameLocked(deps)({ ownerId: "user-1", gameId, locked: true }),
	],
	[
		"setGameOptions",
		(deps, gameId) =>
			createSetGameOptions(deps)({
				ownerId: "user-1",
				gameId,
				options: { autoplay: true },
			}),
	],
	[
		"signalHost",
		(deps, gameId) => createSignalHost(deps)({ ownerId: "user-1", gameId }),
	],
	[
		"removePlayer",
		(deps, gameId) =>
			createRemovePlayer(deps)({
				ownerId: "user-1",
				gameId,
				playerId: "player-1",
			}),
	],
	[
		"endGame",
		(deps, gameId) => createEndGame(deps)({ ownerId: "user-1", gameId }),
	],
	[
		"joinGame",
		(deps, gameId) =>
			createJoinGame(deps)({ clientKey: "ip", gameId, nickname: "Bia" }),
	],
	[
		"getPlayerSession",
		(deps, gameId) => createGetPlayerSession(deps)({ gameId, ...player }),
	],
	[
		"submitAnswer",
		(deps, gameId) =>
			createSubmitAnswer(deps)({
				gameId,
				...player,
				questionIndex: 0,
				choiceIds: ["choice-1"],
			}),
	],
	[
		"changeAvatar",
		(deps, gameId) =>
			createChangeAvatar(deps)({
				gameId,
				...player,
				avatar: { character: "fox", accessory: null },
			}),
	],
];

describe("the live game's use cases and assignments (spec 029; ADR 0014)", () => {
	it.each(liveUseCases)(
		"%s treats an assignment as missing",
		async (_name, run) => {
			const { deps, gameId } = await withAssignment();
			const before = await deps.games.findById(gameId);

			const attempt = run(deps, gameId);

			await expect(attempt).rejects.toBeInstanceOf(DomainError);
			expect(await deps.games.findById(gameId)).toEqual(before);
			expect(await deps.players.countActive(gameId)).toBe(1);
		},
	);

	it("hosting does not end the quiz's open assignments", async () => {
		const { deps, gameId } = await withAssignment();

		await createHostGame(deps)({ ownerId: "user-1", quizId: "quiz-1" });

		expect((await deps.games.findById(gameId))?.endedAt).toBeNull();
	});

	it("a deleted quiz ends its assignments too", async () => {
		const { deps, gameId } = await withAssignment();

		await createEndGamesOfQuiz(deps)({
			quizId: "quiz-1",
			reason: "quizDeleted",
		});

		expect(await deps.games.findById(gameId)).toMatchObject({
			status: "ended",
			endReason: "quizDeleted",
		});
	});
});
