import { describe, expect, it } from "vitest";

import type { Question } from "../../quiz/domain/question";
import {
	aPuzzleQuestion,
	aQuestion,
	aSliderQuestion,
	aTypeAnswerQuestion,
} from "../../quiz/testing/a-question";
import { AnswersClosedError } from "../domain/answer";
import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { GameEndedError } from "../domain/game";
import { ParticipantNotAtStageError } from "../domain/participant-progress";
import { createGameDeps } from "../testing/game-deps";
import { createAnswerAssignmentQuestion } from "./answer-assignment-question";
import { createCreateAssignment } from "./create-assignment";
import { createEndAssignment } from "./end-assignment";
import { createGetAssignmentPlay } from "./get-assignment-play";
import { createJoinAssignment } from "./join-assignment";

const DAY_MS = 24 * 60 * 60 * 1000;

async function playing(options = {}, questions?: Question[]) {
	const deps = createGameDeps({ questions });
	const { gameId } = await createCreateAssignment(deps)({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: new Date(deps.clock.now().getTime() + 3 * DAY_MS),
		options: { ...DEFAULT_ASSIGNMENT_OPTIONS, ...options },
	});
	const john = await createJoinAssignment(deps)({
		clientKey: "ip",
		gameId,
		nickname: "John",
	});
	const participant = { gameId, playerId: john.playerId, secret: john.secret };
	const answer = (choiceIds: string[], questionIndex = 0) =>
		createAnswerAssignmentQuestion(deps)({
			...participant,
			questionIndex,
			choiceIds,
		});
	return { deps, gameId, john, answer };
}

describe("answerAssignmentQuestion (spec 030, RN-10, RN-11, RN-13)", () => {
	it("a right answer in 2 s of 20 is worth 950 and goes to the results", async () => {
		const { deps, gameId, john, answer } = await playing();
		deps.clock.advanceBy(2000);

		const view = await answer(["choice-1"]);

		expect(view.screen).toMatchObject({
			phase: "results",
			total: 950,
			result: {
				result: "correct",
				chosenIds: ["choice-1"],
				rightIds: ["choice-1"],
				points: 950,
			},
		});
		expect(await deps.answers.find(gameId, 0, john.playerId)).toMatchObject({
			responseTimeMs: 2000,
			points: 950,
		});
	});

	it("a wrong answer is worth nothing and reveals the right one", async () => {
		const { answer } = await playing();

		const view = await answer(["choice-2"]);

		expect(view.screen).toMatchObject({
			phase: "results",
			total: 0,
			result: { result: "wrong", rightIds: ["choice-1"], points: 0 },
		});
	});

	it("without the timer a right answer is worth the full points", async () => {
		const { deps, answer } = await playing({ questionTimer: false });
		deps.clock.advanceBy(5 * 60_000);

		expect((await answer(["choice-1"])).screen).toMatchObject({
			result: { points: 1000 },
		});
	});

	it("multiple selection counts per right answer", async () => {
		const { answer } = await playing({}, [
			aQuestion({
				id: "question-1",
				selection: "multiple",
				choices: ["A", "B", "C", "D"].map((text, index) => ({
					id: `choice-${index + 1}`,
					text,
					correct: index < 2,
				})),
			}),
		]);

		expect((await answer(["choice-1"])).screen).toMatchObject({
			result: { result: "partiallyCorrect" },
		});
	});

	it("an answer past the deadline is refused and the results show", async () => {
		const { deps, john, answer } = await playing();
		deps.clock.advanceBy(21_000);

		await expect(answer(["choice-1"])).rejects.toThrow(AnswersClosedError);
		expect((await deps.players.findById(john.playerId))?.progress?.phase).toBe(
			"results",
		);
	});

	it("an answer to another question is refused", async () => {
		const { answer } = await playing();

		await expect(answer(["true"], 1)).rejects.toThrow(
			ParticipantNotAtStageError,
		);
	});

	it("a second answer is refused", async () => {
		const { answer } = await playing();
		await answer(["choice-1"]);

		await expect(answer(["choice-2"])).rejects.toThrow(
			ParticipantNotAtStageError,
		);
	});

	it("an answer whose progress moved meanwhile still goes to its results", async () => {
		const { deps, john, answer } = await playing({ questionTimer: false });
		// A resume of the same nickname restarts the question's time in between.
		const save = deps.players.saveProgressIfAt.bind(deps.players);
		let raced = false;
		deps.players.saveProgressIfAt = async (playerId, from, next) => {
			if (!raced) {
				raced = true;
				await save(playerId, from, {
					...from,
					startedAt: new Date(from.startedAt.getTime() + 1000),
				});
			}
			return save(playerId, from, next);
		};

		const view = await answer(["choice-1"]);

		expect(view.screen.phase).toBe("results");
		expect((await deps.players.findById(john.playerId))?.progress?.phase).toBe(
			"results",
		);
	});

	it("an answer stored while the progress stayed behind is taken to its results", async () => {
		const { deps, gameId, john, answer } = await playing({
			questionTimer: false,
		});
		await deps.answers.add({
			gameId,
			questionIndex: 0,
			playerId: john.playerId,
			choiceIds: ["choice-1"],
			responseTimeMs: 0,
			correctness: "correct",
			points: 1000,
			receivedAt: deps.clock.now(),
			text: null,
			value: null,
			reviewedAt: null,
		});

		const view = await answer(["choice-1"]);

		expect(view.screen).toMatchObject({ phase: "results", total: 1000 });
	});

	it("an answer after the activity ended is refused", async () => {
		const { deps, gameId, answer } = await playing();
		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		await expect(answer(["choice-1"])).rejects.toThrow(GameEndedError);
	});
});

describe("a type answer in an assignment (spec 031, RN-34, RN-35)", () => {
	const questions = [
		aTypeAnswerQuestion({
			acceptedAnswers: ["Pedro", "Simão"],
			timeLimitSeconds: 30,
		}),
	];

	async function typing(options = {}) {
		const setup = await playing(options, questions);
		const type = (text: string) =>
			createAnswerAssignmentQuestion(setup.deps)({
				gameId: setup.gameId,
				playerId: setup.john.playerId,
				secret: setup.john.secret,
				questionIndex: 0,
				text,
			});
		return { ...setup, type };
	}

	it("a right typed answer goes to the results with its points", async () => {
		const { deps, type } = await typing();
		deps.clock.advanceBy(15_000);

		const view = await type(" pedro ");

		expect(view.screen).toMatchObject({
			phase: "results",
			total: 750,
			result: {
				result: "correct",
				chosenIds: [],
				rightIds: [],
				typedText: "pedro",
				acceptedAnswers: ["Pedro", "Simão"],
				points: 750,
			},
		});
	});

	it("without the timer a right typed answer is worth the full points", async () => {
		const { deps, type } = await typing({ questionTimer: false });
		deps.clock.advanceBy(60_000);

		expect((await type("Simao")).screen).toMatchObject({
			phase: "results",
			result: { result: "correct", points: 1000 },
		});
	});

	it("accepted answers never show while answering", async () => {
		const { deps, gameId, john } = await typing();

		const view = await createGetAssignmentPlay(deps)({
			gameId,
			playerId: john.playerId,
			secret: john.secret,
		});

		expect(view.screen.phase).toBe("answering");
		expect(JSON.stringify(view)).not.toContain("Simão");
	});
});

describe("a slider in an assignment (spec 032, RN-33, RN-34)", () => {
	async function sliding(options = {}) {
		const setup = await playing(options, [aSliderQuestion()]);
		const slide = (value: number) =>
			createAnswerAssignmentQuestion(setup.deps)({
				gameId: setup.gameId,
				playerId: setup.john.playerId,
				secret: setup.john.secret,
				questionIndex: 0,
				value,
			});
		return { ...setup, slide };
	}

	it("a slider answer without the question timer earns full points when exact", async () => {
		const { deps, slide } = await sliding({ questionTimer: false });
		deps.clock.advanceBy(60_000);

		expect((await slide(600)).screen).toMatchObject({
			phase: "results",
			result: { result: "correct", points: 1000 },
		});
	});

	it("a slider's result shows the value sent, the answer and the margin range", async () => {
		const { slide } = await sliding();

		expect((await slide(640)).screen).toMatchObject({
			phase: "results",
			result: {
				sliderValue: 640,
				sliderAnswer: { answer: 600, low: 520, high: 680, unit: "anos" },
			},
		});
	});

	it("the scale shows while answering, without the answer", async () => {
		const { deps, gameId, john } = await sliding();

		const view = await createGetAssignmentPlay(deps)({
			gameId,
			playerId: john.playerId,
			secret: john.secret,
		});

		expect(view.screen).toMatchObject({
			phase: "answering",
			question: { slider: { first: 104, last: 896, step: 8 } },
		});
		expect(JSON.stringify(view)).not.toMatch(/"answer"|margin|600/);
	});

	it("an almost correct slider answer loses only the precision part without the timer", async () => {
		const { slide } = await sliding({ questionTimer: false });

		expect((await slide(640)).screen).toMatchObject({
			phase: "results",
			result: { result: "almostCorrect", points: 600 },
		});
	});
});

describe("a puzzle in an assignment (spec 033, RN-28, RN-29)", () => {
	const RIGHT = ["Nilo", "Amazonas", "Yangtzé", "Mississipi"];

	/** The participant's blocks, and the ids of the given texts in that order. */
	async function puzzleOf(setup: Awaited<ReturnType<typeof playing>>): Promise<{
		choices: { id: string; shapeIndex: number; text: string }[];
		idsOf: (texts: readonly string[]) => string[];
	}> {
		const view = await createGetAssignmentPlay(setup.deps)({
			gameId: setup.gameId,
			playerId: setup.john.playerId,
			secret: setup.john.secret,
		});
		if (view.screen.phase !== "answering") {
			throw new Error(`Expected the answers, got ${view.screen.phase}`);
		}
		const choices = view.screen.question.choices;
		const idOf = new Map(choices.map(({ id, text }) => [text, id]));
		return {
			choices,
			idsOf: (texts) => texts.map((text) => idOf.get(text) ?? ""),
		};
	}

	it("each participant sees the puzzle in their own order with the shapes of its places", async () => {
		const setup = await playing({}, [aPuzzleQuestion()]);

		const { choices } = await puzzleOf(setup);

		// The test shuffler draws backwards, never the right order.
		expect(choices.map(({ shapeIndex, text }) => [shapeIndex, text])).toEqual([
			[0, "Mississipi"],
			[1, "Yangtzé"],
			[2, "Amazonas"],
			[3, "Nilo"],
		]);
		// The ids do not tell the right order either (spec 033, RN-17).
		const ids = choices.map(({ id }) => id);
		const byRight = RIGHT.map(
			(text) => ids[choices.findIndex((c) => c.text === text)],
		);
		expect([...ids].sort()).not.toEqual(byRight);
		const view = await createGetAssignmentPlay(setup.deps)({
			gameId: setup.gameId,
			playerId: setup.john.playerId,
			secret: setup.john.secret,
		});
		expect(JSON.stringify(view)).not.toMatch(/rightOrder|correct/);
	});

	it("a puzzle without a timer gives full points", async () => {
		const setup = await playing({ questionTimer: false }, [aPuzzleQuestion()]);
		const { idsOf } = await puzzleOf(setup);
		setup.deps.clock.advanceBy(60_000);

		expect((await setup.answer(idsOf(RIGHT))).screen).toMatchObject({
			phase: "results",
			result: { result: "correct", points: 1000 },
		});
	});

	it("the result of a puzzle has the sent order and the right one", async () => {
		const setup = await playing({}, [aPuzzleQuestion()]);
		const { idsOf } = await puzzleOf(setup);
		const sent = idsOf(["Amazonas", "Nilo", "Yangtzé", "Mississipi"]);

		expect((await setup.answer(sent)).screen).toMatchObject({
			phase: "results",
			result: {
				result: "wrong",
				points: 0,
				chosenIds: sent,
				rightOrder: idsOf(RIGHT),
			},
		});
	});
});
