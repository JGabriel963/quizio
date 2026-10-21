import { describe, expect, it } from "vitest";

import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { GameNotFoundError } from "../domain/game";
import { anAnswer } from "../testing/a-game-question";
import { createGameDeps } from "../testing/game-deps";
import { createCreateAssignment } from "./create-assignment";
import { createEndAssignment } from "./end-assignment";
import { createGetAssignmentPlay } from "./get-assignment-play";
import { createJoinAssignment } from "./join-assignment";

const DAY_MS = 24 * 60 * 60 * 1000;

/** An assignment of the two playable questions: a Quiz of 20 s and a true/false of 10 s. */
async function playing(options = {}) {
	const deps = createGameDeps();
	const { gameId } = await createCreateAssignment(deps)({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: new Date(deps.clock.now().getTime() + 3 * DAY_MS),
		options: { ...DEFAULT_ASSIGNMENT_OPTIONS, ...options },
	});
	deps.assignmentLanding.creatorNames.set("user-1", "Ana");
	const join = createJoinAssignment(deps);
	const john = await join({ gameId, nickname: "John" });
	const participant = { gameId, playerId: john.playerId, secret: john.secret };
	const play = () => createGetAssignmentPlay(deps)(participant);
	const moveTo = async (progress: {
		questionIndex: number;
		phase: "answering" | "results" | "scoreboard" | "finished";
	}) => {
		const player = await deps.players.findById(john.playerId);
		if (player) {
			await deps.players.save({
				...player,
				progress: { ...progress, startedAt: deps.clock.now() },
			});
		}
	};
	const answer = (questionIndex: number, correct: boolean, points: number) =>
		deps.answers.add(
			anAnswer({
				gameId,
				playerId: john.playerId,
				questionIndex,
				choiceIds: [correct ? "choice-1" : "choice-2"],
				correctness: correct ? "correct" : "wrong",
				points,
			}),
		);
	return { deps, gameId, john, join, play, moveTo, answer };
}

describe("getAssignmentPlay (spec 030)", () => {
	it("answering gives the public question in the participant's order and the time left, never which answer is right", async () => {
		const { deps, play } = await playing({ randomizeAnswers: true });
		deps.clock.advanceBy(5000);

		const view = await play();

		expect(view).toMatchObject({
			nickname: "John",
			questionCount: 2,
			activity: { name: "Bom de Bíblia (Junho)", creatorName: "Ana" },
			endedEarly: false,
			screen: {
				phase: "answering",
				remainingMs: 15_000,
				durationMs: 20_000,
				question: {
					index: 0,
					type: "quiz",
					text: expect.any(String),
					choices: [
						{ id: "choice-4", shapeIndex: 3, text: "Recife" },
						{ id: "choice-3", shapeIndex: 2, text: "Salvador" },
						{ id: "choice-2", shapeIndex: 1, text: "Rio de Janeiro" },
						{ id: "choice-1", shapeIndex: 0, text: "Brasília" },
					],
				},
			},
			history: [],
		});
		expect(JSON.stringify(view)).not.toContain("correct");
	});

	it("without the timer the time left is null", async () => {
		const { deps, play } = await playing({ questionTimer: false });
		deps.clock.advanceBy(10 * 60_000);

		expect((await play()).screen).toMatchObject({
			phase: "answering",
			remainingMs: null,
			durationMs: null,
		});
	});

	it("coming back within the time gives what is left", async () => {
		const { deps, play } = await playing();
		deps.clock.advanceBy(15_000);

		expect((await play()).screen).toMatchObject({
			phase: "answering",
			remainingMs: 5000,
		});
	});

	it("coming back past the time shows the results without an answer", async () => {
		const { deps, john, play } = await playing();
		deps.clock.advanceBy(60_000);

		const view = await play();

		expect(view.screen).toMatchObject({
			phase: "results",
			total: 0,
			result: {
				result: "unanswered",
				chosenIds: [],
				rightIds: ["choice-1"],
				points: 0,
			},
		});
		expect(
			(await deps.players.findById(john.playerId))?.progress,
		).toMatchObject({ phase: "results", questionIndex: 0 });
	});

	it("the history has every question already with results", async () => {
		const { answer, moveTo, play } = await playing();
		await answer(0, true, 950);
		await moveTo({ questionIndex: 1, phase: "results" });
		await answer(1, false, 0);

		const { history, screen } = await play();

		expect(
			history.map(({ question, result }) => [question.index, result]),
		).toEqual([
			[0, "correct"],
			[1, "wrong"],
		]);
		expect(screen).toMatchObject({ phase: "results", total: 950 });
	});

	it("the scoreboard has everyone's points up to that question, as in a live game", async () => {
		const { deps, gameId, join, answer, moveTo, play } = await playing();
		const claude = await join({ gameId, nickname: "claude" });
		await deps.answers.add(
			anAnswer({
				gameId,
				playerId: claude.playerId,
				questionIndex: 0,
				points: 900,
			}),
		);
		await deps.answers.add(
			anAnswer({
				gameId,
				playerId: claude.playerId,
				questionIndex: 1,
				points: 800,
			}),
		);
		await answer(0, true, 950);
		await moveTo({ questionIndex: 0, phase: "scoreboard" });

		const { screen } = await play();

		expect(
			screen.phase === "scoreboard" && screen.scoreboard.top,
		).toMatchObject([
			{ nickname: "John", total: 950, rank: 1 },
			{ nickname: "claude", total: 900, rank: 2 },
		]);
	});

	it("who passed someone in that question gets the arrow", async () => {
		const { deps, gameId, join, answer, moveTo, play } = await playing();
		const claude = await join({ gameId, nickname: "claude" });
		await deps.answers.add(
			anAnswer({
				gameId,
				playerId: claude.playerId,
				questionIndex: 0,
				points: 900,
			}),
		);
		await answer(0, true, 500);
		await answer(1, true, 950);
		await moveTo({ questionIndex: 1, phase: "scoreboard" });

		const { screen } = await play();

		expect(
			screen.phase === "scoreboard" && screen.scoreboard.top,
		).toMatchObject([
			{
				nickname: "John",
				total: 1450,
				rank: 1,
				climbed: true,
				previous: { rank: 2, total: 500 },
			},
			{ nickname: "claude", total: 900, rank: 2, climbed: false },
		]);
	});

	it("a finished participant gets the place and the standings of now", async () => {
		const { deps, gameId, join, answer, moveTo, play } = await playing();
		await answer(0, true, 950);
		await answer(1, true, 900);
		await moveTo({ questionIndex: 1, phase: "finished" });
		const claude = await join({ gameId, nickname: "claude" });
		await deps.answers.add(
			anAnswer({
				gameId,
				playerId: claude.playerId,
				questionIndex: 0,
				points: 1000,
			}),
		);
		await deps.answers.add(
			anAnswer({
				gameId,
				playerId: claude.playerId,
				questionIndex: 1,
				points: 1000,
			}),
		);

		const view = await play();

		expect(view.screen).toMatchObject({
			phase: "finished",
			place: 2,
			total: 1850,
		});
		expect(view.history).toHaveLength(2);
	});

	it("an ended activity finishes the participant in the middle", async () => {
		const { deps, gameId, john, play } = await playing();
		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		const view = await play();

		expect(view).toMatchObject({
			endedEarly: true,
			activity: { remainingMs: null },
			screen: { phase: "finished", place: 1, total: 0 },
			history: [],
		});
		expect((await deps.players.findById(john.playerId))?.progress?.phase).toBe(
			"finished",
		);
	});

	it("ended during the last question, it still says the activity was ended", async () => {
		const { deps, gameId, answer, moveTo, play } = await playing();
		await answer(0, true, 950);
		await moveTo({ questionIndex: 1, phase: "answering" });
		deps.clock.advanceBy(1000);
		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		expect((await play()).endedEarly).toBe(true);
	});

	it("who finished before the end is not told the activity was ended", async () => {
		const { deps, gameId, answer, moveTo, play } = await playing();
		await answer(0, true, 950);
		await answer(1, true, 900);
		await moveTo({ questionIndex: 1, phase: "finished" });
		deps.clock.advanceBy(1000);
		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		expect((await play()).endedEarly).toBe(false);
	});

	it("a wrong secret is missing", async () => {
		const { deps, gameId, john } = await playing();

		await expect(
			createGetAssignmentPlay(deps)({
				gameId,
				playerId: john.playerId,
				secret: "nope",
			}),
		).rejects.toThrow(GameNotFoundError);
	});
});
