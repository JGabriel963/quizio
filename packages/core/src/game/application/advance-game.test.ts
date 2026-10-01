import { describe, expect, it } from "vitest";

import { GameEndedError, GameNotFoundError } from "../domain/game";
import { GAME_EVENTS } from "../domain/game-events";
import { StageNotDueError } from "../domain/game-progress";
import { createStartedGame } from "../testing/started-game";
import { createEndGame } from "./end-game";
import { createFindGameByPin } from "./find-game-by-pin";

const gameIntro = { questionIndex: 0, phase: "gameIntro" } as const;
const intro = { questionIndex: 0, phase: "questionIntro" } as const;
const answering = { questionIndex: 0, phase: "answering" } as const;
const results = { questionIndex: 0, phase: "results" } as const;

describe("advanceGame (spec 009)", () => {
	it("walks a question through its phases", async () => {
		const { deps, host, advance } = await createStartedGame();

		deps.clock.advanceBy(3_000);
		const opening = await advance({ ...host, from: gameIntro });
		expect(opening.stage).toMatchObject({
			questionIndex: 0,
			phase: "questionIntro",
			remainingMs: 5_000,
			question: { type: "quiz", text: "Qual é a capital do Brasil?" },
		});

		deps.clock.advanceBy(5_000);
		const open = await advance({ ...host, from: intro });
		expect(open.stage).toMatchObject({
			phase: "answering",
			remainingMs: 20_000,
			durationMs: 20_000,
			answerCount: 0,
		});

		deps.clock.advanceBy(20_000);
		const revealed = await advance({ ...host, from: answering });
		expect(revealed.stage).toMatchObject({
			phase: "results",
			remainingMs: null,
		});
	});

	it("tells the screens the public stage of each phase", async () => {
		const { deps, reach } = await createStartedGame();

		await reach("answering");

		const stages = deps.realtime.messages
			.filter((message) => message.event === GAME_EVENTS.stageChanged)
			.map((message) => message.payload);
		expect(stages).toHaveLength(3);
		expect(stages[2]).toEqual({
			status: "playing",
			stage: {
				questionIndex: 0,
				questionCount: 2,
				phase: "answering",
				durationMs: 20_000,
				question: {
					type: "quiz",
					selection: "single",
					choices: [
						{ id: "choice-1", shapeIndex: 0, label: null },
						{ id: "choice-2", shapeIndex: 1, label: null },
						{ id: "choice-3", shapeIndex: 2, label: null },
						{ id: "choice-4", shapeIndex: 3, label: null },
					],
				},
			},
		});
	});

	it("refuses to open the answers before the intro is over", async () => {
		const { deps, host, advance, reach, stage } = await createStartedGame();
		await reach("questionIntro");
		deps.clock.advanceBy(2_000);

		await expect(advance({ ...host, from: intro })).rejects.toThrow(
			StageNotDueError,
		);
		expect(await stage()).toEqual(intro);
	});

	it("refuses to close the answers early unless it is a skip", async () => {
		const { deps, host, advance, reach, stage } = await createStartedGame();
		await reach("answering");
		deps.clock.advanceBy(5_000);

		await expect(advance({ ...host, from: answering })).rejects.toThrow(
			StageNotDueError,
		);
		expect(await stage()).toEqual(answering);

		const revealed = await advance({ ...host, from: answering, skip: true });
		expect(revealed.stage?.phase).toBe("results");
	});

	it("a repeated request changes nothing", async () => {
		const { deps, host, advance, reach, stage } = await createStartedGame();
		await reach("results");
		const published = deps.realtime.messages.length;

		const first = await advance({ ...host, from: results });
		const second = await advance({ ...host, from: results });

		expect(first.stage).toMatchObject({
			questionIndex: 1,
			phase: "questionIntro",
		});
		expect(second.stage).toMatchObject({
			questionIndex: 1,
			phase: "questionIntro",
		});
		expect(await stage()).toEqual({ questionIndex: 1, phase: "questionIntro" });
		expect(deps.realtime.messages).toHaveLength(published + 1);
	});

	it("applies a transition once when two requests race", async () => {
		const { deps, host, advance, reach, stage } = await createStartedGame();
		await reach("answering");
		deps.clock.advanceBy(20_000);

		await Promise.all([
			advance({ ...host, from: answering }),
			advance({ ...host, from: answering }),
		]);

		expect(await stage()).toEqual(results);
		expect(
			deps.realtime.messages.filter(
				(message) =>
					message.event === GAME_EVENTS.stageChanged &&
					(message.payload as { stage: { phase: string } }).stage.phase ===
						"results",
			),
		).toHaveLength(1);
	});

	it("shows the results to a host who comes back after the time", async () => {
		const { deps, host, advance, reach } = await createStartedGame();
		await reach("answering");
		deps.clock.advanceBy(30_000);

		const view = await advance({ ...host, from: answering });

		expect(view.stage?.phase).toBe("results");
	});

	it("finishes after the last results and frees the PIN", async () => {
		const { deps, host, advance, reach, stored } = await createStartedGame();
		await reach("results", 1);

		const view = await advance({
			...host,
			from: { questionIndex: 1, phase: "results" },
		});

		expect(view).toMatchObject({ status: "finished", stage: null });
		expect(await stored()).toMatchObject({
			status: "finished",
			endedAt: deps.clock.now(),
			endReason: null,
		});
		expect(deps.realtime.messages.at(-1)).toMatchObject({
			event: GAME_EVENTS.stageChanged,
			payload: { status: "finished", stage: null },
		});
		await expect(
			createFindGameByPin(deps)({ pin: "265914", clientKey: "ip" }),
		).rejects.toMatchObject({ code: "GAME.PIN_NOT_RECOGNIZED" });
	});

	it("a game that is over takes no transition", async () => {
		const finished = await createStartedGame();
		await finished.reach("results", 1);
		const last = { questionIndex: 1, phase: "results" } as const;
		await finished.advance({ ...finished.host, from: last });

		await expect(
			finished.advance({ ...finished.host, from: last }),
		).rejects.toThrow(GameEndedError);

		const ended = await createStartedGame();
		await createEndGame(ended.deps)(ended.host);
		await expect(
			ended.advance({ ...ended.host, from: gameIntro }),
		).rejects.toThrow(GameEndedError);
	});

	it("is not found for another creator", async () => {
		const { deps, advance, stage } = await createStartedGame();
		deps.clock.advanceBy(3_000);

		await expect(
			advance({ ownerId: "user-2", gameId: "game-1", from: gameIntro }),
		).rejects.toThrow(GameNotFoundError);
		expect(await stage()).toEqual(gameIntro);
	});
});
