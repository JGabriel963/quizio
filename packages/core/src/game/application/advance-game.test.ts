import { describe, expect, it } from "vitest";

import { GameEndedError, GameNotFoundError } from "../domain/game";
import { GAME_EVENTS } from "../domain/game-events";
import { StageNotDueError } from "../domain/game-progress";
import { createStartedGame } from "../testing/started-game";
import { createEndGame } from "./end-game";
import { createFindGameByPin } from "./find-game-by-pin";
import { createSetGameOptions } from "./set-game-options";

const gameIntro = { questionIndex: 0, phase: "gameIntro" } as const;
const intro = { questionIndex: 0, phase: "questionIntro" } as const;
const answering = { questionIndex: 0, phase: "answering" } as const;
const results = { questionIndex: 0, phase: "results" } as const;
const scoreboard = { questionIndex: 0, phase: "scoreboard" } as const;

describe("advanceGame (spec 009)", () => {
	it("walks a question through its phases", async () => {
		const { deps, host, advance } = await createStartedGame();

		deps.clock.advanceBy(3_000);
		const opening = await advance({ ...host, from: gameIntro });
		expect(opening.stage).toMatchObject({
			questionIndex: 0,
			phase: "questionIntro",
			remainingMs: 6_500,
			question: { type: "quiz", text: "Qual é a capital do Brasil?" },
		});

		deps.clock.advanceBy(6_500);
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
					text: null,
					image: null,
					choices: [
						{ id: "choice-1", shapeIndex: 0, label: null, text: null },
						{ id: "choice-2", shapeIndex: 1, label: null, text: null },
						{ id: "choice-3", shapeIndex: 2, label: null, text: null },
						{ id: "choice-4", shapeIndex: 3, label: null, text: null },
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

	it("shows the scoreboard between questions", async () => {
		const { host, advance, reach, stage } = await createStartedGame();
		await reach("results");

		const board = await advance({ ...host, from: results });
		expect(board.stage).toMatchObject({
			questionIndex: 0,
			phase: "scoreboard",
			remainingMs: null,
			question: null,
			distribution: null,
		});

		const next = await advance({ ...host, from: scoreboard });
		expect(next.stage).toMatchObject({
			questionIndex: 1,
			phase: "questionIntro",
		});
		expect(await stage()).toEqual({ questionIndex: 1, phase: "questionIntro" });
	});

	it("a repeated request stays at the scoreboard", async () => {
		const { deps, host, advance, reach, stage } = await createStartedGame();
		await reach("results");
		const published = deps.realtime.messages.length;

		const first = await advance({ ...host, from: results });
		const second = await advance({ ...host, from: results });

		expect(first.stage).toMatchObject({
			questionIndex: 0,
			phase: "scoreboard",
		});
		expect(second.stage).toMatchObject({
			questionIndex: 0,
			phase: "scoreboard",
		});
		expect(await stage()).toEqual(scoreboard);
		expect(deps.realtime.messages).toHaveLength(published + 1);
	});

	it("the scoreboard waits for the host", async () => {
		const { deps, reach, stage } = await createStartedGame();
		await reach("scoreboard");

		deps.clock.advanceBy(120_000);

		expect(await stage()).toEqual(scoreboard);
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

	it("finishes at the last results, without a scoreboard, and frees the PIN (spec 011)", async () => {
		const { deps, host, advance, reach, stored } = await createStartedGame();
		await reach("results", 1);

		const view = await advance({
			...host,
			from: { questionIndex: 1, phase: "results" },
		});

		expect(view).toMatchObject({
			status: "finished",
			stage: null,
			final: { revealRemainingMs: 7_000 },
		});
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

	it("a repeated request after the end changes nothing and gets the podium (spec 011)", async () => {
		const { deps, host, advance, finish, stored } = await createStartedGame();
		await finish();
		const endedAt = (await stored()).endedAt;
		const messages = deps.realtime.messages.length;
		deps.clock.advanceBy(3_000);

		const again = await advance({
			...host,
			from: { questionIndex: 1, phase: "results" },
		});

		expect(again).toMatchObject({
			status: "finished",
			final: { revealRemainingMs: 4_000 },
		});
		expect((await stored()).endedAt).toEqual(endedAt);
		expect(deps.realtime.messages).toHaveLength(messages);
	});

	it("an ended game takes no transition", async () => {
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

	it("the stage sent to the devices follows the option (spec 012)", async () => {
		const { deps, host, reach } = await createStartedGame();
		const sent = () =>
			deps.realtime.messages
				.filter((message) => message.event === GAME_EVENTS.stageChanged)
				.map(
					(message) =>
						(
							message.payload as {
								stage: {
									phase: string;
									question: {
										text: string | null;
										choices: { text: string | null }[];
									} | null;
								};
							}
						).stage,
				);
		await reach("answering");
		expect(sent().at(-1)?.question?.text).toBeNull();

		// Turned on in the middle of the answers: it shows from the next stage on (RN-21).
		await createSetGameOptions(deps)({
			...host,
			options: { showQuestionsOnDevices: true },
		});
		expect(sent()).toHaveLength(3);
		await reach("questionIntro", 1);

		expect(sent().at(-1)).toMatchObject({
			phase: "questionIntro",
			question: { text: "A capital do Brasil é Brasília" },
		});
		await reach("answering", 1);
		expect(
			sent()
				.at(-1)
				?.question?.choices.map((choice) => choice.text),
		).toEqual(["Verdadeiro", "Falso"]);
	});
});
