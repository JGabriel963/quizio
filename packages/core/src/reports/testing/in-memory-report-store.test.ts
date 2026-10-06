import { describe, expect, it } from "vitest";

import { aReportGame } from "./a-report-game";
import { InMemoryReportStore } from "./in-memory-report-store";

const now = new Date("2026-06-20T12:00:00.000Z");
const day = (n: number) =>
	new Date(`2026-06-${String(n).padStart(2, "0")}T18:00:00.000Z`);

const game = (gameId: string, header: Record<string, unknown> = {}) =>
	aReportGame({
		header: { gameId, ...header },
		questions: 2,
		players: ["Ana", "Bia"],
		answers: { Ana: ["right", "right"], Bia: ["right", "wrong"] },
	});

describe("InMemoryReportStore", () => {
	it("lists the owner's reports of a section, newest end first", async () => {
		const store = new InMemoryReportStore([
			game("game-1", { endedAt: day(10) }),
			game("game-2", { endedAt: day(12) }),
			game("game-3", { endedAt: day(11), trashedAt: day(13) }),
			game("game-4", { endedAt: day(14), ownerId: "user-2" }),
		]);

		const list = (section: "reports" | "trash") =>
			store
				.listHeaders({ ownerId: "user-1", section, now })
				.then((headers) => headers.map(({ gameId }) => gameId));

		expect(await list("reports")).toEqual(["game-2", "game-1"]);
		expect(await list("trash")).toEqual(["game-3"]);
	});

	it("finds a header by its game, whoever owns it", async () => {
		const store = new InMemoryReportStore([game("game-1")]);

		expect((await store.findHeader("game-1", now))?.gameId).toBe("game-1");
		expect(await store.findHeader("game-9", now)).toBeNull();
	});

	it("tallies give each game's participants and right answers", async () => {
		const store = new InMemoryReportStore([game("game-1")]);
		const headers = await store.listHeaders({
			ownerId: "user-1",
			section: "reports",
			now,
		});

		expect(await store.tallies(headers)).toEqual([
			{
				gameId: "game-1",
				participantFirstQuestions: [0, 0],
				correctAnswers: 3,
			},
		]);
	});

	it("gives a game with only its played questions and their answers", async () => {
		const store = new InMemoryReportStore([
			aReportGame({
				header: {
					questionCount: 3,
					outcome: "ended",
					stoppedAt: { questionIndex: 1, phase: "answering" },
				},
				questions: 3,
				players: ["Ana"],
				answers: { Ana: ["right", "right", null] },
			}),
		]);

		const found = await store.findGame("game-1", now);

		expect(found?.questions.map(({ index }) => index)).toEqual([0]);
		expect(found?.answers.map(({ questionIndex }) => questionIndex)).toEqual([
			0,
		]);
	});

	it("saveName keeps the trash and saveTrashed keeps the name", async () => {
		const store = new InMemoryReportStore([game("game-1")]);

		await store.saveTrashed(["game-1"], day(15));
		await store.saveName("game-1", "Turma A");
		expect(await store.findHeader("game-1", now)).toMatchObject({
			name: "Turma A",
			trashedAt: day(15),
		});

		await store.saveTrashed(["game-1"], null);
		expect(await store.findHeader("game-1", now)).toMatchObject({
			name: "Turma A",
			trashedAt: null,
		});
	});

	it("delete removes the games", async () => {
		const store = new InMemoryReportStore([game("game-1"), game("game-2")]);

		await store.delete(["game-1"]);

		expect(await store.findHeader("game-1", now)).toBeNull();
		expect(await store.findGame("game-2", now)).not.toBeNull();
	});
});
