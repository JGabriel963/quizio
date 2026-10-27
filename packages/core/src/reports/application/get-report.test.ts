import { describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { InMemoryQuizShareGrants } from "../../shared/testing/in-memory-quiz-share-grants";
import { ReportInTrashError, ReportNotFoundError } from "../domain/report";
import {
	type AnswerSpec,
	aReportGame,
	aReportQuestion,
} from "../testing/a-report-game";
import { InMemoryReportStore } from "../testing/in-memory-report-store";
import { createGetReport } from "./get-report";

function setup(game: ReturnType<typeof aReportGame>) {
	const storage = new InMemoryObjectStorage();
	const quizShareGrants = new InMemoryQuizShareGrants();
	const getReport = createGetReport({
		reportGames: new InMemoryReportStore([game]),
		storage,
		clock: new FixedClock("2026-06-20T12:00:00.000Z"),
		quizShareGrants,
	});
	return {
		storage,
		quizShareGrants,
		get: (ownerId = "user-1", gameId = "game-1") =>
			getReport({ ownerId, gameId }),
	};
}

const started = new Date("2026-06-13T17:45:10.000Z");
const ended = new Date("2026-06-13T17:56:40.000Z");

describe("getReport (spec 015)", () => {
	it("tells the header, the totals and the overall accuracy", async () => {
		const { get } = setup(
			aReportGame({
				header: { name: "Capitais", startedAt: started, endedAt: ended },
				questions: 4,
				players: ["Ana", "Bia"],
				answers: {
					Ana: ["right", "right", "right", "wrong"],
					Bia: ["right", "wrong", null, null],
				},
			}),
		);

		const report = await get();

		expect(report.header).toEqual({
			gameId: "game-1",
			mode: "live",
			name: "Capitais",
			coverUrl: null,
			startedAt: started,
			endedAt: ended,
			endedEarly: false,
			questionCount: 4,
			playedCount: 4,
			participantCount: 2,
			quizId: "quiz-1",
			canPlayAgain: true,
			playQuizId: "quiz-1",
			readOnly: false,
			assignment: null,
		});
		expect(report.summary).toMatchObject({
			accuracyPercent: 50,
			durationMs: 11 * 60_000 + 30_000,
		});
	});

	it("a game ended in the middle tells how many were played", async () => {
		const answers: AnswerSpec[] = ["right", "wrong", "right"];
		const { get } = setup(
			aReportGame({
				header: {
					questionCount: 5,
					status: "ended",
					stoppedAt: { questionIndex: 2, phase: "answering" },
				},
				questions: 5,
				players: ["Ana"],
				answers: { Ana: answers },
			}),
		);

		const report = await get();

		expect(report.header).toMatchObject({
			endedEarly: true,
			questionCount: 5,
			playedCount: 2,
		});
		expect(report.questions.map(({ index }) => index)).toEqual([0, 1]);
		expect(report.summary.accuracyPercent).toBe(50);
		expect(report.participants[0]).toMatchObject({ total: 1000 });
	});

	it("a game ended before any results has an empty summary", async () => {
		const { get } = setup(
			aReportGame({
				header: {
					questionCount: 3,
					status: "ended",
					stoppedAt: { questionIndex: 0, phase: "answering" },
				},
				questions: 3,
				players: ["Ana", "Bia"],
				answers: { Ana: ["right"] },
			}),
		);

		const report = await get();

		expect(report.header).toMatchObject({
			playedCount: 0,
			participantCount: 2,
		});
		expect(report.summary).toMatchObject({
			accuracyPercent: null,
			hardestQuestion: null,
			difficultCount: 0,
			needsHelp: [],
			didNotFinish: [],
		});
		expect(report.questions).toEqual([]);
		expect(report.participants.map(({ total }) => total)).toEqual([0, 0]);
	});

	it("another creator's report is not found", async () => {
		const { get } = setup(aReportGame({ questions: 1, players: ["Ana"] }));

		await expect(get("user-2")).rejects.toBeInstanceOf(ReportNotFoundError);
		await expect(get("user-1", "game-9")).rejects.toBeInstanceOf(
			ReportNotFoundError,
		);
	});

	it("a trashed report does not open", async () => {
		const { get } = setup(
			aReportGame({
				header: { trashedAt: new Date("2026-06-15T10:00:00.000Z") },
				questions: 1,
				players: ["Ana"],
			}),
		);

		await expect(get()).rejects.toBeInstanceOf(ReportInTrashError);
	});

	it("the summary has the hardest question and who needs help, in order", async () => {
		const { get, storage } = setup(
			aReportGame({
				questions: [
					aReportQuestion(0),
					aReportQuestion(1, {
						text: "Quem escreveu o Salmo 90?",
						imageKey: "questions/salmo.png",
					}),
					aReportQuestion(2),
				],
				players: ["Ana", "Bia", "Caio", "Dani"],
				answers: {
					Ana: ["right", "wrong", "right"],
					Bia: ["wrong", "wrong", "right"],
					Caio: ["wrong", "wrong", "wrong"],
					Dani: ["wrong", "wrong", null],
				},
			}),
		);

		const { summary } = await get();

		expect(summary.hardestQuestion).toEqual({
			index: 1,
			text: "Quem escreveu o Salmo 90?",
			type: "quiz",
			accuracyPercent: 0,
			difficult: true,
			imageUrl: storage.getPublicUrl("questions/salmo.png"),
			averageResponseTimeMs: 2000,
		});
		expect(summary.difficultCount).toBe(2);
		expect(
			summary.needsHelp.map(({ nickname, accuracyPercent }) => ({
				nickname,
				accuracyPercent,
			})),
		).toEqual([
			{ nickname: "Caio", accuracyPercent: 0 },
			{ nickname: "Dani", accuracyPercent: 0 },
			{ nickname: "Bia", accuracyPercent: 33 },
		]);
		expect(
			summary.didNotFinish.map(({ nickname, unanswered }) => ({
				nickname,
				unanswered,
			})),
		).toEqual([{ nickname: "Dani", unanswered: 1 }]);
	});

	it("nothing difficult and nobody in need gives empty lists", async () => {
		const { get } = setup(
			aReportGame({
				questions: 2,
				players: ["Ana", "Bia"],
				answers: { Ana: ["right", "right"], Bia: ["right", "wrong"] },
			}),
		);

		expect((await get()).summary).toMatchObject({
			hardestQuestion: null,
			difficultCount: 0,
			needsHelp: [],
			didNotFinish: [],
		});
	});

	it("participants come by rank and questions in the order they were played", async () => {
		const { get } = setup(
			aReportGame({
				questions: [
					aReportQuestion(0, { text: "Primeira" }),
					aReportQuestion(1, { text: "Segunda", type: "trueFalse" }),
				],
				players: ["Ana", "Bia"],
				answers: { Ana: ["wrong", "wrong"], Bia: ["right", "wrong"] },
			}),
		);

		const report = await get();

		expect(report.participants).toEqual([
			{
				playerId: "player-Bia",
				nickname: "Bia",
				rank: 1,
				total: 1000,
				accuracyPercent: 50,
				unanswered: 0,
				needsHelp: false,
			},
			{
				playerId: "player-Ana",
				nickname: "Ana",
				rank: 2,
				total: 0,
				accuracyPercent: 0,
				unanswered: 0,
				needsHelp: true,
			},
		]);
		expect(report.questions).toEqual([
			{
				index: 0,
				text: "Primeira",
				type: "quiz",
				accuracyPercent: 50,
				difficult: false,
			},
			{
				index: 1,
				text: "Segunda",
				type: "trueFalse",
				accuracyPercent: 0,
				difficult: true,
			},
		]);
	});

	it("without its quiz, a report has no images and no play again", async () => {
		const game = (quiz: null | { coverImageKey: string }) =>
			aReportGame({
				header: {
					quiz: quiz && {
						ownerId: "user-1",
						trashed: false,
						playable: true,
						...quiz,
					},
				},
				questions: [aReportQuestion(0, { imageKey: "questions/a.png" })],
				players: ["Ana"],
				answers: { Ana: ["wrong"] },
			});

		const withQuiz = await setup(game({ coverImageKey: "covers/a.png" })).get();
		const without = await setup(game(null)).get();

		expect(withQuiz.header.coverUrl).toContain("covers/a.png");
		expect(withQuiz.summary.hardestQuestion?.imageUrl).toContain(
			"questions/a.png",
		);
		expect(without.header).toMatchObject({
			coverUrl: null,
			quizId: null,
			canPlayAgain: false,
		});
		expect(without.summary.hardestQuestion).toMatchObject({
			text: "Pergunta 1",
			imageUrl: null,
		});
	});

	it("a quiz in the trash cannot be played again or viewed", async () => {
		const { get } = setup(
			aReportGame({
				header: {
					quiz: {
						ownerId: "user-1",
						trashed: true,
						playable: true,
						coverImageKey: null,
					},
				},
				questions: 1,
				players: ["Ana"],
			}),
		);

		expect((await get()).header).toMatchObject({
			quizId: null,
			canPlayAgain: false,
		});
	});
});

describe("getReport of a shared quiz (spec 037, RN-24)", () => {
	const carlasGame = () =>
		aReportGame({
			header: {
				ownerId: "carla",
				quiz: {
					ownerId: "user-1",
					trashed: false,
					playable: true,
					coverImageKey: null,
				},
			},
			questions: 1,
			players: ["Ana"],
		});

	it("the quiz link is only for its owner", async () => {
		const { get, quizShareGrants } = setup(carlasGame());
		quizShareGrants.grant("carla", "quiz-1");

		expect((await get("carla")).header.quizId).toBeNull();
	});

	it("playQuizId for a member with a grant, null otherwise", async () => {
		const { get, quizShareGrants } = setup(carlasGame());

		expect((await get("carla")).header).toMatchObject({
			canPlayAgain: false,
			playQuizId: null,
		});
		quizShareGrants.grant("carla", "quiz-1");
		expect((await get("carla")).header).toMatchObject({
			canPlayAgain: true,
			playQuizId: "quiz-1",
		});
	});

	it("the owner plays their own quiz again", async () => {
		const { get } = setup(aReportGame({ questions: 1, players: ["Ana"] }));

		expect((await get()).header).toMatchObject({
			quizId: "quiz-1",
			canPlayAgain: true,
			playQuizId: "quiz-1",
		});
	});
});

describe("getReport of an assignment (spec 029)", () => {
	const deadline = new Date("2026-06-23T12:00:00.000Z");
	const openAssignment = () =>
		aReportGame({
			header: {
				mode: "assignment",
				status: "open",
				endedAt: null,
				startedAt: new Date("2026-06-19T14:11:00.000Z"),
				deadline,
				pin: "04352236",
				questionCount: 3,
			},
			questions: 3,
			players: [],
			answers: {},
		});

	it("an open assignment's report has its deadline, time left and PIN", async () => {
		const getReport = createGetReport({
			reportGames: new InMemoryReportStore([openAssignment()]),
			storage: new InMemoryObjectStorage(),
			clock: new FixedClock("2026-06-20T12:00:00.000Z"),
		});

		const { header } = await getReport({ ownerId: "user-1", gameId: "game-1" });

		expect(header).toMatchObject({
			mode: "assignment",
			endedAt: null,
			endedEarly: false,
			participantCount: 0,
			assignment: {
				open: true,
				deadline,
				remainingMs: 3 * 24 * 60 * 60 * 1000,
				pin: "04352236",
			},
		});
	});

	it("an open assignment lists every question with no accuracy", async () => {
		const getReport = createGetReport({
			reportGames: new InMemoryReportStore([openAssignment()]),
			storage: new InMemoryObjectStorage(),
			clock: new FixedClock("2026-06-20T12:00:00.000Z"),
		});

		const report = await getReport({ ownerId: "user-1", gameId: "game-1" });

		expect(report.header.playedCount).toBe(3);
		expect(report.questions.map((q) => q.accuracyPercent)).toEqual([
			null,
			null,
			null,
		]);
		expect(report.summary).toMatchObject({
			accuracyPercent: null,
			hardestQuestion: null,
			needsHelp: [],
			didNotFinish: [],
		});
	});

	it("a live report has no assignment part", async () => {
		const getReport = createGetReport({
			reportGames: new InMemoryReportStore([
				aReportGame({
					questions: 1,
					players: ["Ana"],
					answers: { Ana: ["right"] },
				}),
			]),
			storage: new InMemoryObjectStorage(),
			clock: new FixedClock("2026-06-20T12:00:00.000Z"),
		});

		const { header } = await getReport({ ownerId: "user-1", gameId: "game-1" });

		expect(header).toMatchObject({ mode: "live", assignment: null });
	});
});

describe("getReport of a played assignment (spec 030, RN-25 to RN-27)", () => {
	const played = () =>
		aReportGame({
			header: {
				mode: "assignment",
				status: "open",
				endedAt: null,
				deadline: new Date("2026-06-23T12:00:00.000Z"),
				pin: "04352236",
				questionCount: 5,
			},
			questions: 5,
			players: ["John"],
			answers: { John: ["right", "right", "wrong", null, null] },
		});
	const getReport = () =>
		createGetReport({
			reportGames: new InMemoryReportStore([played()]),
			storage: new InMemoryObjectStorage(),
			clock: new FixedClock("2026-06-20T12:00:00.000Z"),
		})({ ownerId: "user-1", gameId: "game-1" });

	it("an assignment counts every question for every participant: 3 of 5 answered is 2 unanswered", async () => {
		const report = await getReport();

		expect(report.participants).toMatchObject([
			{ nickname: "John", accuracyPercent: 40, unanswered: 2 },
		]);
		expect(report.summary.didNotFinish).toMatchObject([
			{ nickname: "John", unanswered: 2 },
		]);
	});

	it("an assignment's summary has no duration", async () => {
		expect((await getReport()).summary.durationMs).toBeNull();
	});
});
