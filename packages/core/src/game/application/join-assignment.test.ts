import { describe, expect, it } from "vitest";

import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import {
	GameEndedError,
	GameFullError,
	GameNotFoundError,
	JOIN_LIMIT_PER_NETWORK,
	JOIN_WINDOW_MS,
	NicknameTakenError,
	TooManyJoinsError,
} from "../domain/game";
import { aGame, aPlayer } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createCreateAssignment } from "./create-assignment";
import { createEndAssignment } from "./end-assignment";
import { createJoinAssignment } from "./join-assignment";

const DAY_MS = 24 * 60 * 60 * 1000;

async function withAssignment(options = {}) {
	const deps = createGameDeps();
	const { gameId } = await createCreateAssignment(deps)({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: new Date(deps.clock.now().getTime() + 3 * DAY_MS),
		options: { ...DEFAULT_ASSIGNMENT_OPTIONS, ...options },
	});
	return { deps, gameId, join: createJoinAssignment(deps) };
}

describe("joinAssignment (spec 030, RN-02 to RN-07)", () => {
	it("joins and starts answering the first question", async () => {
		const { deps, gameId, join } = await withAssignment();

		const joined = await join({ clientKey: "ip", gameId, nickname: " John " });

		expect(joined).toEqual({
			playerId: expect.any(String),
			secret: expect.any(String),
			nickname: "John",
		});
		expect(await deps.players.findById(joined.playerId)).toMatchObject({
			gameId,
			nickname: "John",
			firstQuestionIndex: 0,
			progress: {
				questionIndex: 0,
				phase: "answering",
				startedAt: deps.clock.now(),
			},
			choiceOrder: null,
		});
	});

	it("with characters on, joins ready with a drawn avatar", async () => {
		const { deps, gameId, join } = await withAssignment({
			gameCharacters: true,
		});

		const { playerId } = await join({
			clientKey: "ip",
			gameId,
			nickname: "John",
		});

		expect(await deps.players.findById(playerId)).toMatchObject({
			progress: { phase: "ready" },
			avatar: { character: "moon", accessory: "fire" },
		});
	});

	it("keeps the avatar the browser remembers", async () => {
		const { deps, gameId, join } = await withAssignment({
			gameCharacters: true,
		});

		const { playerId } = await join({
			clientKey: "ip",
			gameId,
			nickname: "John",
			avatar: { character: "fox", accessory: null },
		});

		expect((await deps.players.findById(playerId))?.avatar).toEqual({
			character: "fox",
			accessory: null,
		});
	});

	it("draws the answer order of each participant when asked", async () => {
		const { deps, gameId, join } = await withAssignment({
			randomizeAnswers: true,
		});

		const { playerId } = await join({
			clientKey: "ip",
			gameId,
			nickname: "John",
		});

		expect((await deps.players.findById(playerId))?.choiceOrder).toEqual([
			["choice-4", "choice-3", "choice-2", "choice-1"],
			["true", "false"],
		]);
	});

	it("a nickname in use is refused, ignoring case and accents", async () => {
		const { gameId, join } = await withAssignment();
		await join({ clientKey: "ip", gameId, nickname: "João" });

		await expect(
			join({ clientKey: "ip", gameId, nickname: "joao" }),
		).rejects.toThrow(NicknameTakenError);
	});

	it("an activity with 200 participants is full", async () => {
		const { deps, gameId, join } = await withAssignment();
		for (let index = 0; index < 200; index++) {
			await deps.players.add(
				aPlayer({
					id: `p-${index}`,
					gameId,
					nickname: `P${index}`,
					secret: `s-${index}`,
				}),
			);
		}

		await expect(
			join({ clientKey: "ip", gameId, nickname: "John" }),
		).rejects.toThrow(GameFullError);
	});

	it("takes 60 participants a minute from one network (RN-04a)", async () => {
		const { deps, gameId, join } = await withAssignment();
		for (let index = 0; index < JOIN_LIMIT_PER_NETWORK; index++) {
			await join({ gameId, nickname: `P${index}`, clientKey: "ip" });
		}

		await expect(
			join({ gameId, nickname: "John", clientKey: "ip" }),
		).rejects.toThrow(TooManyJoinsError);
		await expect(
			join({ gameId, nickname: "John", clientKey: "other" }),
		).resolves.toBeDefined();
		deps.clock.advanceBy(JOIN_WINDOW_MS);
		await expect(
			join({ gameId, nickname: "Mary", clientKey: "ip" }),
		).resolves.toBeDefined();
	});

	it("a nickname in use does not count as a join (RN-04a)", async () => {
		const { gameId, join } = await withAssignment();
		await join({ gameId, nickname: "John", clientKey: "ip" });
		for (let attempt = 0; attempt < JOIN_LIMIT_PER_NETWORK; attempt++) {
			await join({ gameId, nickname: "john", clientKey: "ip" }).catch(() => {});
		}

		await expect(
			join({ gameId, nickname: "Mary", clientKey: "ip" }),
		).resolves.toBeDefined();
	});

	it("an ended activity refuses", async () => {
		const { deps, gameId, join } = await withAssignment();
		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		await expect(
			join({ clientKey: "ip", gameId, nickname: "John" }),
		).rejects.toThrow(GameEndedError);
	});

	it("a live game is missing", async () => {
		const { deps, join } = await withAssignment();
		await deps.games.save(aGame({ id: "live", pin: "111111", quizId: "q-2" }));

		await expect(
			join({ clientKey: "ip", gameId: "live", nickname: "John" }),
		).rejects.toThrow(GameNotFoundError);
	});
});
