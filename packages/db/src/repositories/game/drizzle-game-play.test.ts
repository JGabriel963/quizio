import { endGame } from "@quizio/core/game/domain/game";
import { nextStage, startGame } from "@quizio/core/game/domain/game-progress";
import { toGameQuestion } from "@quizio/core/game/domain/game-question";
import { aGame, aPlayer, aPlayingGame } from "@quizio/core/game/testing/a-game";
import {
	aGameQuestion,
	anAnswer,
} from "@quizio/core/game/testing/a-game-question";
import { newQuizVersion } from "@quizio/core/quiz/domain/quiz-version";
import {
	aQuestion,
	aTrueFalseQuestion,
} from "@quizio/core/quiz/testing/a-question";
import { aPublishedQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { game as gameTable } from "../../schema/game";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleQuizVersionRepository } from "../quiz/drizzle-quiz-version-repository";
import { createDrizzleAnswerRepository } from "./drizzle-answer-repository";
import { createDrizzleGameQuestionRepository } from "./drizzle-game-question-repository";
import { createDrizzleGameRepository } from "./drizzle-game-repository";
import { createDrizzlePlayableQuizQuery } from "./drizzle-playable-quiz-query";
import { createDrizzlePlayerRepository } from "./drizzle-player-repository";

const at = (iso: string) => new Date(iso);
const now = at("2026-06-01T12:00:00.000Z");

describe("game play repositories (spec 009)", () => {
	let testDb: TestDatabase;
	let games: ReturnType<typeof createDrizzleGameRepository>;
	let players: ReturnType<typeof createDrizzlePlayerRepository>;
	let gameQuestions: ReturnType<typeof createDrizzleGameQuestionRepository>;
	let answers: ReturnType<typeof createDrizzleAnswerRepository>;
	let quizzes: ReturnType<typeof createDrizzleQuizRepository>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db
			.insert(user)
			.values([{ id: "user-1", name: "Ana", email: "ana@quizio.test" }]);
		games = createDrizzleGameRepository(testDb.db);
		players = createDrizzlePlayerRepository(testDb.db);
		gameQuestions = createDrizzleGameQuestionRepository(testDb.db);
		answers = createDrizzleAnswerRepository(testDb.db);
		quizzes = createDrizzleQuizRepository(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		// Games, players, questions and answers go with the quiz.
		await testDb.db.delete(gameTable);
		await testDb.db.delete(quizTable);
		await quizzes.save(aPublishedQuiz({ id: "quiz-1" }));
		await games.create(aGame());
		await players.add(aPlayer({ id: "p1", nickname: "Ana" }));
		await players.add(aPlayer({ id: "p2", nickname: "Bia" }));
	});

	describe("the progress of a game", () => {
		it("stores and reads where a game is", async () => {
			const playing = aPlayingGame("answering", {
				questionIndex: 1,
				questionCount: 3,
				since: at("2026-06-01T12:05:00.250Z"),
			});

			await games.save(playing);

			expect(await games.findById("game-1")).toEqual(playing);
			expect(await games.findUnendedByPin("265914")).toEqual(playing);
		});

		it("reads a lobby without progress", async () => {
			expect(await games.findById("game-1")).toMatchObject({
				status: "lobby",
				questionCount: 0,
				progress: null,
			});
		});

		it("starts a game only from the lobby", async () => {
			const started = startGame(aGame(), {
				playerCount: 2,
				questionCount: 3,
				now,
			});

			expect(await games.saveIfAt(started, null)).toBe(true);
			expect(await games.saveIfAt(started, null)).toBe(false);
			expect(await games.findById("game-1")).toEqual(started);
		});

		it("saves a transition only from the expected stage", async () => {
			const answering = aPlayingGame("answering", { since: now });
			await games.save(answering);
			const from = { questionIndex: 0, phase: "answering" } as const;
			const results = nextStage(answering, {
				timeLimitSeconds: 20,
				skip: true,
				now: at("2026-06-01T12:00:05.000Z"),
			});

			// Two tabs ask for the same transition: one of them makes it.
			expect(await games.saveIfAt(results, from)).toBe(true);
			expect(await games.saveIfAt(results, from)).toBe(false);
			expect(
				await games.saveIfAt(results, { questionIndex: 1, phase: "results" }),
			).toBe(false);
			expect(await games.findById("game-1")).toEqual(results);
		});

		it("leaves the padlock and the other fields alone", async () => {
			const answering = aPlayingGame("answering", { since: now });
			await games.save({ ...answering, locked: true });

			await games.saveIfAt(
				nextStage(answering, { timeLimitSeconds: 20, skip: true, now }),
				{ questionIndex: 0, phase: "answering" },
			);

			expect((await games.findById("game-1"))?.locked).toBe(true);
		});

		it("does not move a game that was ended", async () => {
			const answering = aPlayingGame("answering", { since: now });
			const ended = endGame(answering, "host", now);
			await games.save(ended);

			expect(
				await games.saveIfAt(
					nextStage(answering, { timeLimitSeconds: 20, skip: true, now }),
					{ questionIndex: 0, phase: "answering" },
				),
			).toBe(false);
			expect(await games.findById("game-1")).toEqual(ended);
		});

		it("finishing frees the PIN", async () => {
			const last = aPlayingGame("scoreboard", {
				questionIndex: 2,
				questionCount: 3,
				since: now,
			});
			await games.save(last);
			const finished = nextStage(last, {
				timeLimitSeconds: 20,
				skip: false,
				now: at("2026-06-01T12:10:00.000Z"),
			});

			expect(
				await games.saveIfAt(finished, {
					questionIndex: 2,
					phase: "scoreboard",
				}),
			).toBe(true);

			expect(await games.findUnendedByPin("265914")).toBeNull();
			expect(await games.findById("game-1")).toMatchObject({
				status: "finished",
				progress: null,
				endedAt: at("2026-06-01T12:10:00.000Z"),
				endReason: null,
			});
		});
	});

	describe("DrizzleGameQuestionRepository", () => {
		const image = {
			key: "quizzes/quiz-1/questions/mapa.png",
			placement: "background" as const,
			crop: { shape: "circle" as const, zoom: 2, x: 0.25, y: 0.75 },
			altText: "Mapa",
		};
		const questions = [
			aGameQuestion({ index: 0, image }),
			toGameQuestion(aTrueFalseQuestion({ correct: false }), 1),
		];

		it("copies and reads the questions", async () => {
			await gameQuestions.saveAll("game-1", questions);

			expect(await gameQuestions.find("game-1", 0)).toEqual(questions[0]);
			expect(await gameQuestions.find("game-1", 1)).toEqual(questions[1]);
			expect(await gameQuestions.find("game-1", 2)).toBeNull();
			expect(await gameQuestions.find("game-2", 0)).toBeNull();
		});

		it("keeps the first copy when the game is started twice", async () => {
			await gameQuestions.saveAll("game-1", questions);
			await gameQuestions.saveAll("game-1", [
				aGameQuestion({ index: 0, text: "Outra" }),
			]);

			expect((await gameQuestions.find("game-1", 0))?.text).toBe(
				"Qual é a capital do Brasil?",
			);
		});
	});

	describe("DrizzleAnswerRepository", () => {
		const first = anAnswer({ playerId: "p1" });
		const second = anAnswer({
			playerId: "p2",
			choiceIds: ["choice-1", "choice-3"],
			correctness: "wrong",
			responseTimeMs: 6_000,
			receivedAt: at("2026-06-01T12:00:06.000Z"),
		});

		it("stores and reads answers in order of arrival", async () => {
			expect(await answers.add(second)).toBe("added");
			expect(await answers.add(first)).toBe("added");

			expect(await answers.listByQuestion("game-1", 0)).toEqual([
				first,
				second,
			]);
			expect(await answers.countByQuestion("game-1", 0)).toBe(2);
			expect(await answers.find("game-1", 0, "p2")).toEqual(second);
			expect(await answers.find("game-1", 1, "p2")).toBeNull();
			expect(await answers.countByQuestion("game-1", 1)).toBe(0);
		});

		it("keeps one answer per player and question", async () => {
			await answers.add(first);

			expect(await answers.add({ ...first, choiceIds: ["choice-2"] })).toBe(
				"alreadyAnswered",
			);
			expect(await answers.find("game-1", 0, "p1")).toEqual(first);

			// The same player answers the next question.
			expect(await answers.add({ ...first, questionIndex: 1 })).toBe("added");
		});

		it("sums the points of each player up to a question", async () => {
			await answers.add({ ...first, points: 875 });
			await answers.add({ ...second, points: 0 });
			await answers.add({ ...first, questionIndex: 1, points: 1000 });
			await answers.add({ ...first, questionIndex: 2, points: 500 });
			const byPlayer = (totals: { playerId: string; total: number }[]) =>
				[...totals].sort((a, b) => a.playerId.localeCompare(b.playerId));

			expect(byPlayer(await answers.totalsThrough("game-1", 0))).toEqual([
				{ playerId: "p1", total: 875 },
				{ playerId: "p2", total: 0 },
			]);
			expect(byPlayer(await answers.totalsThrough("game-1", 1))).toEqual([
				{ playerId: "p1", total: 1875 },
				{ playerId: "p2", total: 0 },
			]);
			expect(await answers.totalsThrough("game-1", -1)).toEqual([]);
			expect(await answers.totalsThrough("game-2", 5)).toEqual([]);
		});

		it("lists a player's answers by question", async () => {
			await answers.add({ ...first, questionIndex: 2, points: 500 });
			await answers.add({ ...first, points: 875 });
			await answers.add(second);

			expect(
				(await answers.listByPlayer("game-1", "p1")).map((answer) => [
					answer.questionIndex,
					answer.points,
				]),
			).toEqual([
				[0, 875],
				[2, 500],
			]);
			expect(await answers.listByPlayer("game-1", "p9")).toEqual([]);
		});
	});

	describe("DrizzlePlayableQuizQuery.questions", () => {
		it("reads the questions of a playable version, whatever came later", async () => {
			const versions = createDrizzleQuizVersionRepository(testDb.db);
			const original = [
				aQuestion({ id: "q1" }),
				aTrueFalseQuestion({ id: "q2", correct: true }),
			];
			await versions.save(
				newQuizVersion({
					quizId: "quiz-1",
					number: 1,
					questions: original,
					now,
				}),
			);
			await versions.save(
				newQuizVersion({
					quizId: "quiz-1",
					number: 2,
					questions: [aQuestion({ id: "q1", text: "Mudou" })],
					now,
				}),
			);
			const query = createDrizzlePlayableQuizQuery(testDb.db);

			expect(await query.questions("quiz-1", 1)).toEqual(original);
			expect(await query.questions("quiz-1", 2)).toHaveLength(1);
			expect(await query.questions("quiz-1", 9)).toEqual([]);
		});
	});
});
