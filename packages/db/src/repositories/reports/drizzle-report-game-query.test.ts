import {
	DEFAULT_ASSIGNMENT_OPTIONS,
	newAssignment,
} from "@quizio/core/game/domain/assignment";
import { endGame, type Game } from "@quizio/core/game/domain/game";
import { revealedThrough } from "@quizio/core/game/domain/game-progress";
import { removePlayer } from "@quizio/core/game/domain/player";
import { rankPlayers } from "@quizio/core/game/domain/standings";
import { aGame, aPlayer, aPlayingGame } from "@quizio/core/game/testing/a-game";
import {
	aGameQuestion,
	anAnswer,
	aPuzzleGameQuestion,
	aSliderGameQuestion,
} from "@quizio/core/game/testing/a-game-question";
import { aPublishedQuiz, aQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { playedQuestionCount } from "@quizio/core/reports/domain/report";
import { participantStats } from "@quizio/core/reports/domain/report-stats";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { user } from "../../schema/auth";
import { game as gameTable } from "../../schema/game";
import { quiz as quizTable } from "../../schema/quiz";
import { createTestDb, type TestDatabase } from "../../testing/create-test-db";
import { createDrizzleAnswerRepository } from "../game/drizzle-answer-repository";
import { createDrizzleGameQuestionRepository } from "../game/drizzle-game-question-repository";
import { createDrizzleGameRepository } from "../game/drizzle-game-repository";
import { createDrizzlePlayerRepository } from "../game/drizzle-player-repository";
import { createDrizzleQuizRepository } from "../quiz/drizzle-quiz-repository";
import { createDrizzleReportGameQuery } from "./drizzle-report-game-query";
import { createDrizzleReportRepository } from "./drizzle-report-repository";

const at = (iso: string) => new Date(iso);
const created = at("2026-06-01T12:00:00.000Z");
const started = at("2026-06-01T12:02:00.000Z");
const ended = at("2026-06-01T12:13:00.000Z");
const now = at("2026-06-02T09:00:00.000Z");

/** A game of three questions that went to the podium. */
const finished = (overrides: Partial<Game> = {}) =>
	aGame({
		status: "finished",
		questionCount: 3,
		createdAt: created,
		startedAt: started,
		endedAt: ended,
		...overrides,
	});

describe("DrizzleReportGameQuery (spec 015)", () => {
	let testDb: TestDatabase;
	let games: ReturnType<typeof createDrizzleGameRepository>;
	let players: ReturnType<typeof createDrizzlePlayerRepository>;
	let gameQuestions: ReturnType<typeof createDrizzleGameQuestionRepository>;
	let answers: ReturnType<typeof createDrizzleAnswerRepository>;
	let quizzes: ReturnType<typeof createDrizzleQuizRepository>;
	let reports: ReturnType<typeof createDrizzleReportRepository>;
	let query: ReturnType<typeof createDrizzleReportGameQuery>;

	beforeAll(async () => {
		testDb = await createTestDb();
		await testDb.db.insert(user).values([
			{ id: "user-1", name: "Ana", email: "ana@quizio.test" },
			{ id: "user-2", name: "Bia", email: "bia@quizio.test" },
		]);
		games = createDrizzleGameRepository(testDb.db);
		players = createDrizzlePlayerRepository(testDb.db);
		gameQuestions = createDrizzleGameQuestionRepository(testDb.db);
		answers = createDrizzleAnswerRepository(testDb.db);
		quizzes = createDrizzleQuizRepository(testDb.db);
		reports = createDrizzleReportRepository(testDb.db);
		query = createDrizzleReportGameQuery(testDb.db);
	});

	afterAll(() => testDb.close());

	beforeEach(async () => {
		await testDb.db.delete(gameTable);
		await testDb.db.delete(quizTable);
		await quizzes.save(aPublishedQuiz({ id: "quiz-1" }));
	});

	const ids = (section: "reports" | "trash" = "reports", ownerId = "user-1") =>
		query
			.listHeaders({ ownerId, section, now })
			.then((headers) => headers.map(({ gameId }) => gameId));

	/** Three questions; `p1` and `p2` in the game. */
	async function seedPlayed(
		game: Game,
		questions = [0, 1, 2].map((index) =>
			aGameQuestion({ index, text: `Pergunta ${index + 1}` }),
		),
	) {
		await games.create(game);
		await players.add(
			aPlayer({
				id: "p1",
				gameId: game.id,
				nickname: "Ana",
				joinedAt: created,
			}),
		);
		await players.add(
			aPlayer({
				id: "p2",
				gameId: game.id,
				nickname: "Bia",
				joinedAt: at("2026-06-01T12:00:30.000Z"),
			}),
		);
		await gameQuestions.saveAll(game.id, questions);
	}

	const answer = (
		playerId: string,
		questionIndex: number,
		right: boolean,
		gameId = "game-1",
	) =>
		answers.add(
			anAnswer({
				gameId,
				playerId,
				questionIndex,
				choiceIds: [right ? "choice-1" : "choice-2"],
				correctness: right ? "correct" : "wrong",
				points: right ? 900 : 0,
			}),
		);

	it("a finished game is a report header", async () => {
		await games.create(finished());

		expect(await query.findHeader("game-1", now)).toEqual({
			gameId: "game-1",
			ownerId: "user-1",
			name: "Bom de Bíblia (Junho)",
			quizId: "quiz-1",
			quiz: { trashed: false, playable: true, coverImageKey: null },
			questionCount: 3,
			status: "finished",
			stoppedAt: null,
			startedAt: started,
			endedAt: ended,
			mode: "live",
			deadline: at("2026-06-01T20:00:00.000Z"),
			pin: null,
			trashedAt: null,
		});
		expect(await ids()).toEqual(["game-1"]);
	});

	it("a game ended in the middle tells where it stopped", async () => {
		const playing = aPlayingGame(
			"answering",
			{ questionIndex: 2, questionCount: 5 },
			{ createdAt: created, startedAt: started },
		);
		await games.create(endGame(playing, "host", ended));

		expect(await query.findHeader("game-1", now)).toMatchObject({
			status: "ended",
			questionCount: 5,
			stoppedAt: { questionIndex: 2, phase: "answering" },
			endedAt: ended,
		});
	});

	it("a game ended in the lobby is not a report", async () => {
		await games.create(endGame(aGame({ createdAt: created }), "host", ended));

		expect(await query.findHeader("game-1", now)).toBeNull();
		expect(await query.findGame("game-1", now)).toBeNull();
		expect(await ids()).toEqual([]);
	});

	it("a game in progress is not a report; one past its deadline is, ended at the deadline", async () => {
		const playing = aPlayingGame(
			"results",
			{ questionIndex: 1, questionCount: 4 },
			{ createdAt: created, startedAt: started },
		);
		await games.create(playing);
		const during = at("2026-06-01T12:10:00.000Z");

		expect(await query.findHeader("game-1", during)).toBeNull();
		expect(
			await query.listHeaders({
				ownerId: "user-1",
				section: "reports",
				now: during,
			}),
		).toEqual([]);

		// Nobody opened it again: the row still says "playing".
		const after = new Date(playing.expiresAt.getTime() + 1);
		expect(await query.findHeader("game-1", after)).toMatchObject({
			status: "ended",
			stoppedAt: { questionIndex: 1, phase: "results" },
			endedAt: playing.expiresAt,
		});
		expect(
			await query.listHeaders({
				ownerId: "user-1",
				section: "reports",
				now: after,
			}),
		).toHaveLength(1);
	});

	it("a lobby past its deadline is not a report", async () => {
		const lobby = aGame({ createdAt: created });
		await games.create(lobby);

		expect(
			await query.findHeader("game-1", new Date(lobby.expiresAt.getTime() + 1)),
		).toBeNull();
	});

	it("headers come by end, newest first", async () => {
		const day = (n: number) => at(`2026-06-0${n}T18:00:00.000Z`);
		await games.create(
			finished({ id: "game-a", pin: "111111", endedAt: day(2) }),
		);
		await games.create(
			finished({ id: "game-b", pin: "222222", endedAt: day(4) }),
		);
		await games.create(
			finished({ id: "game-c", pin: "333333", endedAt: day(3) }),
		);
		// Same end: by id.
		await games.create(
			finished({ id: "game-d", pin: "444444", endedAt: day(3) }),
		);

		expect(await ids("reports")).toEqual([
			"game-b",
			"game-c",
			"game-d",
			"game-a",
		]);
	});

	it("only the owner's games", async () => {
		await quizzes.save(aPublishedQuiz({ id: "quiz-2", ownerId: "user-2" }));
		await games.create(finished());
		await games.create(
			finished({
				id: "game-2",
				pin: "222222",
				ownerId: "user-2",
				quizId: "quiz-2",
			}),
		);

		expect(await ids("reports", "user-1")).toEqual(["game-1"]);
		expect(await ids("reports", "user-2")).toEqual(["game-2"]);
	});

	it("the name is the report's own, or the game's title", async () => {
		await games.create(finished({ title: "Capitais" }));
		expect((await query.findHeader("game-1", now))?.name).toBe("Capitais");

		await reports.saveName("game-1", "Capitais — Turma A");

		expect((await query.findHeader("game-1", now))?.name).toBe(
			"Capitais — Turma A",
		);
		expect(
			(
				await query.listHeaders({ ownerId: "user-1", section: "reports", now })
			)[0]?.name,
		).toBe("Capitais — Turma A");
	});

	it("the trash section has the trashed reports", async () => {
		const trashedAt = at("2026-06-01T20:00:00.000Z");
		await games.create(finished());
		await games.create(finished({ id: "game-2", pin: "222222" }));
		await reports.saveTrashed(["game-2"], trashedAt);

		expect(await ids("reports")).toEqual(["game-1"]);
		expect(await ids("trash")).toEqual(["game-2"]);
		expect((await query.findHeader("game-2", now))?.trashedAt).toEqual(
			trashedAt,
		);
	});

	it("tells the quiz's state, or none once it was deleted", async () => {
		await games.create(finished());
		const quizOf = async () => (await query.findHeader("game-1", now))?.quiz;

		await quizzes.save(
			aPublishedQuiz({ id: "quiz-1", coverImageKey: "covers/a.png" }),
		);
		expect(await quizOf()).toEqual({
			trashed: false,
			playable: true,
			coverImageKey: "covers/a.png",
		});

		await quizzes.save(
			aPublishedQuiz({
				id: "quiz-1",
				trashedAt: at("2026-06-01T21:00:00.000Z"),
			}),
		);
		expect(await quizOf()).toMatchObject({ trashed: true, playable: true });

		await quizzes.save(aQuiz({ id: "quiz-1" }));
		expect(await quizOf()).toMatchObject({ trashed: false, playable: false });

		// Deleted for good: the report stays (RN-05).
		await quizzes.delete("quiz-1");
		expect(await query.findHeader("game-1", now)).toMatchObject({
			quizId: "quiz-1",
			quiz: null,
			name: "Bom de Bíblia (Junho)",
		});
		expect(await ids()).toEqual(["game-1"]);
	});

	it("a player removed in the lobby is not a participant", async () => {
		await seedPlayed(finished());
		await players.add(
			removePlayer(
				aPlayer({
					id: "p3",
					nickname: "Dani",
					joinedAt: at("2026-06-01T12:00:45.000Z"),
				}),
				at("2026-06-01T12:01:00.000Z"),
			),
		);
		await players.add(
			aPlayer({
				id: "p4",
				nickname: "Caio",
				firstQuestionIndex: 2,
				joinedAt: at("2026-06-01T12:05:00.000Z"),
			}),
		);

		const game = await query.findGame("game-1", now);

		// In order of arrival.
		expect(game?.participants).toEqual([
			{ id: "p1", nickname: "Ana", firstQuestionIndex: 0, joinedAt: created },
			{
				id: "p2",
				nickname: "Bia",
				firstQuestionIndex: 0,
				joinedAt: at("2026-06-01T12:00:30.000Z"),
			},
			{
				id: "p4",
				nickname: "Caio",
				firstQuestionIndex: 2,
				joinedAt: at("2026-06-01T12:05:00.000Z"),
			},
		]);
	});

	it("tallies count right answers to played questions only", async () => {
		const stopped = endGame(
			aPlayingGame(
				"answering",
				{ questionIndex: 2, questionCount: 3 },
				{ createdAt: created, startedAt: started },
			),
			"host",
			ended,
		);
		await seedPlayed(stopped);
		await answer("p1", 0, true);
		await answer("p1", 1, true);
		await answer("p2", 0, true);
		await answer("p2", 1, false);
		// The third question was on the screen when the game was ended.
		await answer("p1", 2, true);
		await games.create(finished({ id: "game-2", pin: "222222" }));

		const headers = await query.listHeaders({
			ownerId: "user-1",
			section: "reports",
			now,
		});
		const tallies = await query.tallies(headers);

		expect(tallies.find(({ gameId }) => gameId === "game-1")).toEqual({
			gameId: "game-1",
			participantFirstQuestions: [0, 0],
			correctAnswers: 3,
		});
		expect(tallies.find(({ gameId }) => gameId === "game-2")).toEqual({
			gameId: "game-2",
			participantFirstQuestions: [],
			correctAnswers: 0,
		});
		expect(await query.tallies([])).toEqual([]);
	});

	it("the report reads the game's questions, not the quiz's", async () => {
		// The quiz has no such question: the game has its own copy.
		await seedPlayed(finished({ questionCount: 1 }), [
			aGameQuestion({
				index: 0,
				text: "Como foi jogada",
				image: {
					key: "questions/a.png",
					placement: "media",
					crop: null,
					altText: null,
				},
			}),
		]);
		await answer("p1", 0, true);
		await answer("p2", 0, false);

		const game = await query.findGame("game-1", now);

		expect(game?.questions).toEqual([
			{
				index: 0,
				type: "quiz",
				text: "Como foi jogada",
				imageKey: "questions/a.png",
				choices: aGameQuestion().choices,
				acceptedAnswers: [],
				slider: null,
				correctOrder: [],
			},
		]);
		expect(game?.answers).toEqual([
			{
				questionIndex: 0,
				playerId: "p1",
				choiceIds: ["choice-1"],
				text: null,
				value: null,
				correctness: "correct",
				points: 900,
				responseTimeMs: 4_200,
				receivedAt: anAnswer().receivedAt,
			},
			{
				questionIndex: 0,
				playerId: "p2",
				choiceIds: ["choice-2"],
				text: null,
				value: null,
				correctness: "wrong",
				points: 0,
				responseTimeMs: 4_200,
				receivedAt: anAnswer().receivedAt,
			},
		]);
	});

	it("reads typed answers and accepted answers of a type answer question (spec 031)", async () => {
		await seedPlayed(finished({ questionCount: 1 }), [
			aGameQuestion({
				index: 0,
				type: "typeAnswer",
				choices: [],
				acceptedAnswers: ["Pedro"],
			}),
		]);
		await answers.add(
			anAnswer({
				playerId: "p1",
				choiceIds: [],
				text: "pedra",
				correctness: "wrong",
				points: 0,
			}),
		);

		const game = await query.findGame("game-1", now);

		expect(game?.questions[0]?.acceptedAnswers).toEqual(["Pedro"]);
		expect(game?.answers[0]).toMatchObject({ text: "pedra", choiceIds: [] });
	});

	it("tallies almost correct answers as right and reads values (spec 032)", async () => {
		await seedPlayed(finished({ questionCount: 1 }), [
			aSliderGameQuestion({ index: 0 }),
		]);
		await answers.add(
			anAnswer({
				playerId: "p1",
				choiceIds: [],
				value: 640,
				correctness: "almostCorrect",
				points: 600,
			}),
		);

		const game = await query.findGame("game-1", now);
		const headers = await query.listHeaders({
			ownerId: "user-1",
			section: "reports",
			now,
		});

		expect(game?.questions[0]?.slider).toMatchObject({ answer: 600 });
		expect(game?.answers[0]).toMatchObject({ value: 640, choiceIds: [] });
		expect((await query.tallies(headers))[0]?.correctAnswers).toBe(1);
	});

	it("reads a puzzle's right order and sent orders (spec 033)", async () => {
		await seedPlayed(finished({ questionCount: 1 }), [
			aPuzzleGameQuestion({ index: 0 }),
		]);
		const sent = ["choice-2", "choice-1", "choice-3", "choice-4"];
		await answers.add(
			anAnswer({
				playerId: "p1",
				choiceIds: sent,
				correctness: "wrong",
				points: 0,
			}),
		);

		const game = await query.findGame("game-1", now);

		expect(game?.questions[0]).toMatchObject({
			type: "puzzle",
			correctOrder: ["choice-1", "choice-2", "choice-3", "choice-4"],
		});
		expect(game?.answers[0]?.choiceIds).toEqual(sent);
	});

	it("leaves out the question that was on the screen when the game ended", async () => {
		const stopped = endGame(
			aPlayingGame(
				"answering",
				{ questionIndex: 1, questionCount: 3 },
				{ createdAt: created, startedAt: started },
			),
			"host",
			ended,
		);
		await seedPlayed(stopped);
		await answer("p1", 0, true);
		await answer("p1", 1, true);

		const game = await query.findGame("game-1", now);

		expect(game?.questions.map(({ index }) => index)).toEqual([0]);
		expect(game?.answers.map(({ questionIndex }) => questionIndex)).toEqual([
			0,
		]);
	});

	it("ranks and counts as the game does", async () => {
		// The reports context repeats two rules of the game's (ADR 0010): they
		// must give the same as the game's own functions.
		const playing = aPlayingGame(
			"scoreboard",
			{ questionIndex: 1, questionCount: 3 },
			{ createdAt: created, startedAt: started },
		);
		await seedPlayed(endGame(playing, "host", ended));
		// A tie in points: Ana arrived first.
		await answer("p1", 0, true);
		await answer("p2", 0, false);
		await answer("p1", 1, false);
		await answer("p2", 1, true);

		const game = await query.findGame("game-1", now);
		if (!game) {
			throw new Error("game-1 should be a report");
		}
		const through = revealedThrough(playing.progress);

		expect(playedQuestionCount(game.header)).toBe(through + 1);
		expect(
			participantStats(game).map(({ playerId, rank, total }) => ({
				playerId,
				rank,
				total,
			})),
		).toEqual(
			rankPlayers(
				await players.listActive("game-1"),
				await answers.totalsThrough("game-1", through),
			).map(({ playerId, rank, total }) => ({ playerId, rank, total })),
		);
	});
	describe("assignments (spec 029)", () => {
		const assignment = (id: string, deadline: string, pin: string) =>
			newAssignment({
				id,
				ownerId: "user-1",
				quizId: "quiz-1",
				quizVersion: 1,
				title: "Capitais",
				pin,
				deadline: at(deadline),
				options: DEFAULT_ASSIGNMENT_OPTIONS,
				questionCount: 3,
				now: created,
			});

		it("an assignment is a report from its creation", async () => {
			await games.create(
				assignment("a-1", "2026-06-04T12:00:00.000Z", "00000001"),
			);

			expect(await ids()).toEqual(["a-1"]);
		});

		it("an open assignment has no end, its deadline and its PIN", async () => {
			await games.create(
				assignment("a-1", "2026-06-04T12:00:00.000Z", "00000001"),
			);

			expect(await query.findHeader("a-1", now)).toMatchObject({
				mode: "assignment",
				status: "open",
				endedAt: null,
				deadline: at("2026-06-04T12:00:00.000Z"),
				pin: "00000001",
				startedAt: created,
				questionCount: 3,
			});
		});

		it("past its deadline an assignment ended at the deadline, without its PIN", async () => {
			await games.create(
				assignment("a-1", "2026-06-02T08:00:00.000Z", "00000001"),
			);

			expect(await query.findHeader("a-1", now)).toMatchObject({
				mode: "assignment",
				status: "ended",
				endedAt: at("2026-06-02T08:00:00.000Z"),
				pin: null,
			});
		});

		it("an assignment ended now has its end and no PIN", async () => {
			const stored = assignment("a-1", "2026-06-04T12:00:00.000Z", "00000001");
			await games.create(stored);
			await games.save(endGame(stored, "host", at("2026-06-01T15:00:00.000Z")));

			expect(await query.findHeader("a-1", now)).toMatchObject({
				status: "ended",
				endedAt: at("2026-06-01T15:00:00.000Z"),
				pin: null,
			});
		});

		it("open assignments come first by deadline, then reports by end", async () => {
			await games.create(finished({ id: "live", pin: "111111" }));
			await games.create(
				assignment("in-5", "2026-06-07T12:00:00.000Z", "00000005"),
			);
			await games.create(
				assignment("in-2", "2026-06-04T12:00:00.000Z", "00000002"),
			);
			await games.create(
				assignment("past", "2026-06-02T08:00:00.000Z", "00000003"),
			);

			expect(await ids()).toEqual(["in-2", "in-5", "past", "live"]);
		});

		it("a live game in the lobby or being played is still not a report", async () => {
			await games.create(
				aGame({ id: "lobby", pin: "111111", quizId: "quiz-2" }),
			);
			await games.create(
				aPlayingGame(
					"answering",
					{},
					{
						id: "playing",
						pin: "222222",
						expiresAt: at("2026-06-02T17:00:00.000Z"),
					},
				),
			);

			expect(await ids()).toEqual([]);
		});

		it("tallies of an assignment without players have no participants", async () => {
			await games.create(
				assignment("a-1", "2026-06-04T12:00:00.000Z", "00000001"),
			);
			const [header] = await query.listHeaders({
				ownerId: "user-1",
				section: "reports",
				now,
			});

			expect(await query.tallies(header ? [header] : [])).toEqual([
				{ gameId: "a-1", participantFirstQuestions: [], correctAnswers: 0 },
			]);
		});
	});
	describe("played assignments (spec 030)", () => {
		const played = () =>
			newAssignment({
				id: "game-1",
				ownerId: "user-1",
				quizId: "quiz-1",
				quizVersion: 1,
				title: "Capitais",
				pin: "00000009",
				deadline: at("2026-06-04T12:00:00.000Z"),
				options: DEFAULT_ASSIGNMENT_OPTIONS,
				questionCount: 3,
				now: created,
			});

		it("an assignment's participants and answers are read, with every question played", async () => {
			await seedPlayed(played());
			await answer("p1", 0, true);
			await answer("p1", 1, false);

			const game = await query.findGame("game-1", now);

			expect(game?.participants.map(({ nickname }) => nickname)).toEqual([
				"Ana",
				"Bia",
			]);
			expect(game?.questions).toHaveLength(3);
			expect(game?.answers).toHaveLength(2);
		});

		it("an assignment ended in the middle keeps the answers given", async () => {
			const assignment = played();
			await seedPlayed(assignment);
			await answer("p1", 0, true);
			await games.save(
				endGame(assignment, "host", at("2026-06-01T13:00:00.000Z")),
			);

			const game = await query.findGame("game-1", now);

			expect(game?.header.status).toBe("ended");
			expect(game?.questions).toHaveLength(3);
			expect(game?.answers).toHaveLength(1);
		});
	});
});
