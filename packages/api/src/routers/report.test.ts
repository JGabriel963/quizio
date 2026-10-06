import { somePlayableQuestions } from "@quizio/core/game/testing/game-deps";
import { newQuizVersion } from "@quizio/core/quiz/domain/quiz-version";
import { aPublishedQuiz } from "@quizio/core/quiz/testing/a-quiz";
import { aReportGame } from "@quizio/core/reports/testing/a-report-game";
import { describe, expect, it } from "vitest";

import { createTestApi } from "../testing/test-context";

const day = (n: number) =>
	new Date(`2026-05-${String(n).padStart(2, "0")}T18:00:00.000Z`);

const report = (gameId: string, header: Record<string, unknown> = {}) =>
	aReportGame({
		header: { gameId, endedAt: day(10), ...header },
		questions: 2,
		players: ["Ana", "Bia"],
		answers: { Ana: ["right", "right"], Bia: ["right", "wrong"] },
	});

function setup(...games: ReturnType<typeof aReportGame>[]) {
	const api = createTestApi();
	for (const game of games) {
		api.reports.put(game);
	}
	return { api, ana: api.callerFor("user-1") };
}

const list = { section: "reports", limit: 20 } as const;

describe("report router (spec 015)", () => {
	it("report.list needs a session", async () => {
		const { api } = setup(report("game-1"));

		await expect(api.callerFor(null).report.list(list)).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	it("lists the reports of who asks", async () => {
		const { api, ana } = setup(
			report("game-1", { endedAt: day(10) }),
			report("game-2", { endedAt: day(12), name: "Química" }),
			report("game-3", { ownerId: "user-2" }),
		);

		const mine = await ana.report.list(list);

		expect(mine.total).toBe(2);
		expect(mine.items.map(({ gameId }) => gameId)).toEqual([
			"game-2",
			"game-1",
		]);
		expect(mine.items[0]).toMatchObject({
			name: "Química",
			participantCount: 2,
			accuracyPercent: 75,
		});
		expect((await ana.report.list({ ...list, search: "quimica" })).total).toBe(
			1,
		);
		expect((await api.callerFor("user-2").report.list(list)).total).toBe(1);
	});

	it("refuses a limit out of range", async () => {
		const { ana } = setup();

		await expect(ana.report.list({ ...list, limit: 0 })).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		await expect(
			ana.report.list({ section: "other" as never, limit: 20 }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("opens a report with its participants and questions", async () => {
		const { ana } = setup(report("game-1"));

		const opened = await ana.report.get({ gameId: "game-1" });

		expect(opened.header).toMatchObject({
			gameId: "game-1",
			name: "Capitais",
			playedCount: 2,
			participantCount: 2,
		});
		expect(opened.summary.accuracyPercent).toBe(75);
		expect(opened.participants.map(({ nickname }) => nickname)).toEqual([
			"Ana",
			"Bia",
		]);
		expect(opened.questions).toHaveLength(2);
	});

	it("opens the details of a participant and of a question", async () => {
		const { ana } = setup(report("game-1"));

		const bia = await ana.report.participant({
			gameId: "game-1",
			playerId: "player-Bia",
		});
		const second = await ana.report.question({
			gameId: "game-1",
			questionIndex: 1,
		});

		expect(bia.answers.map(({ result }) => result)).toEqual([
			"correct",
			"wrong",
		]);
		expect(second.choices.map(({ count }) => count)).toEqual([1, 1, 0, 0]);
	});

	it("report.get answers NOT_FOUND for another owner", async () => {
		const { api } = setup(report("game-1"));
		const beto = api.callerFor("user-2");

		for (const call of [
			beto.report.get({ gameId: "game-1" }),
			beto.report.get({ gameId: "missing" }),
			beto.report.participant({ gameId: "game-1", playerId: "player-Ana" }),
			beto.report.question({ gameId: "game-1", questionIndex: 0 }),
			beto.report.rename({ gameId: "game-1", name: "Meu" }),
			beto.report.moveToTrash({ gameIds: ["game-1"] }),
		]) {
			await expect(call).rejects.toMatchObject({
				code: "NOT_FOUND",
				cause: { code: "REPORT.NOT_FOUND" },
			});
		}
	});

	it("report.get tells REPORT.IN_TRASH for a trashed report", async () => {
		const { ana } = setup(report("game-1", { trashedAt: day(15) }));

		await expect(ana.report.get({ gameId: "game-1" })).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "REPORT.IN_TRASH" },
		});
	});

	it("report.rename renames, and tells REPORT.INVALID_NAME", async () => {
		const { ana } = setup(report("game-1"));

		expect(
			await ana.report.rename({ gameId: "game-1", name: " Turma A " }),
		).toEqual({ name: "Turma A" });
		expect((await ana.report.get({ gameId: "game-1" })).header.name).toBe(
			"Turma A",
		);
		await expect(
			ana.report.rename({ gameId: "game-1", name: "   " }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			cause: { code: "REPORT.INVALID_NAME" },
		});
	});

	it("trash, restore and delete take several ids", async () => {
		const { ana } = setup(report("game-1"), report("game-2"), report("game-3"));
		const ids = (section: "reports" | "trash") =>
			ana.report
				.list({ section, limit: 20 })
				.then(({ items }) => items.map(({ gameId }) => gameId).sort());

		await ana.report.moveToTrash({ gameIds: ["game-1", "game-2"] });
		expect(await ids("reports")).toEqual(["game-3"]);
		expect(await ids("trash")).toEqual(["game-1", "game-2"]);

		await ana.report.restore({ gameIds: ["game-2"] });
		expect(await ids("reports")).toEqual(["game-2", "game-3"]);

		await expect(
			ana.report.deletePermanently({ gameIds: ["game-1", "game-3"] }),
		).rejects.toMatchObject({ cause: { code: "REPORT.NOT_IN_TRASH" } });
		await ana.report.deletePermanently({ gameIds: ["game-1"] });
		expect(await ids("trash")).toEqual([]);
		await expect(ana.report.get({ gameId: "game-1" })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});

		await expect(ana.report.moveToTrash({ gameIds: [] })).rejects.toMatchObject(
			{ code: "BAD_REQUEST" },
		);
	});

	it("deleting a quiz for good drops its unstarted games and keeps the started ones", async () => {
		const api = createTestApi();
		await api.quizzes.save(aPublishedQuiz({ title: "Capitais" }));
		await api.versions.save(
			newQuizVersion({
				quizId: "quiz-1",
				number: 1,
				questions: somePlayableQuestions(),
				now: new Date("2026-02-01T10:00:00.000Z"),
			}),
		);
		const ana = api.callerFor("user-1");
		// One game played, then another left in the lobby.
		const played = await ana.game.host({ quizId: "quiz-1" });
		await api
			.callerFor(null)
			.game.join.enter({ gameId: played.gameId, nickname: "Ana" });
		await ana.game.start({ gameId: played.gameId });
		const lobby = await ana.game.host({ quizId: "quiz-1" });

		await ana.quiz.moveToTrash({ quizId: "quiz-1" });
		await ana.quiz.deletePermanently({ quizId: "quiz-1" });

		expect(await api.games.findById(lobby.gameId)).toBeNull();
		// It started, so it stays, as a report (RN-05); the new game ended it.
		expect(await api.games.findById(played.gameId)).toMatchObject({
			status: "ended",
			quizId: "quiz-1",
		});
	});
});
