import { describe, expect, it } from "vitest";

import { FixedClock } from "../../shared/testing/fixed-clock";
import { InMemoryObjectStorage } from "../../shared/testing/in-memory-object-storage";
import { type AnswerSpec, aReportGame } from "../testing/a-report-game";
import { InMemoryReportStore } from "../testing/in-memory-report-store";
import { createListReports } from "./list-reports";

const day = (n: number) =>
	new Date(`2026-06-${String(n).padStart(2, "0")}T18:00:00.000Z`);

function setup(...games: ReturnType<typeof aReportGame>[]) {
	const reportGames = new InMemoryReportStore(games);
	const storage = new InMemoryObjectStorage();
	const listReports = createListReports({
		reportGames,
		storage,
		clock: new FixedClock("2026-06-20T12:00:00.000Z"),
	});
	const list = (input: Partial<Parameters<typeof listReports>[0]> = {}) =>
		listReports({ ownerId: "user-1", section: "reports", limit: 20, ...input });
	return { reportGames, storage, list };
}

const named = (
	gameId: string,
	name: string,
	header: Record<string, unknown> = {},
) =>
	aReportGame({
		header: { gameId, name, ...header },
		questions: 1,
		players: ["Ana"],
		answers: { Ana: ["right"] },
	});

describe("listReports (spec 015)", () => {
	it("lists a finished game with its title, counts, accuracy and end", async () => {
		const { list } = setup(
			aReportGame({
				header: { name: "Capitais", endedAt: day(13) },
				questions: 3,
				players: ["Ana", "Bia"],
				answers: {
					Ana: ["right", "right", "wrong"],
					Bia: ["right", "wrong", null],
				},
			}),
		);

		expect(await list()).toEqual({
			total: 1,
			items: [
				{
					gameId: "game-1",
					name: "Capitais",
					coverUrl: null,
					questionCount: 3,
					participantCount: 2,
					accuracyPercent: 50,
					endedEarly: false,
					endedAt: day(13),
					trashedAt: null,
					quizId: "quiz-1",
					canPlayAgain: true,
				},
			],
		});
	});

	it("a game ended before any results has no accuracy", async () => {
		const { list } = setup(
			aReportGame({
				header: {
					questionCount: 5,
					outcome: "ended",
					stoppedAt: { questionIndex: 0, phase: "answering" },
				},
				questions: 5,
				players: ["Ana", "Bia"],
				answers: { Ana: ["right"] },
			}),
		);

		const { items } = await list();

		expect(items[0]).toMatchObject({
			accuracyPercent: null,
			endedEarly: true,
			participantCount: 2,
			questionCount: 5,
		});
	});

	it("a game ended in the middle counts only what was played", async () => {
		const answers: AnswerSpec[] = ["right", "wrong", "right"];
		const { list } = setup(
			aReportGame({
				header: {
					questionCount: 5,
					outcome: "ended",
					stoppedAt: { questionIndex: 2, phase: "answering" },
				},
				questions: 5,
				players: ["Ana"],
				// The third answer is to the question that was on the screen.
				answers: { Ana: answers },
			}),
		);

		expect((await list()).items[0]).toMatchObject({
			accuracyPercent: 50,
			endedEarly: true,
		});
	});

	it("two games of the same quiz are two reports, each with its own numbers", async () => {
		const { list } = setup(
			aReportGame({
				header: { gameId: "game-1", endedAt: day(12) },
				questions: 2,
				players: ["Ana", "Bia"],
				answers: { Ana: ["right", "right"], Bia: ["right", "right"] },
			}),
			aReportGame({
				header: { gameId: "game-2", endedAt: day(13) },
				questions: 2,
				players: ["Caio", "Dani", "Edu"],
				answers: { Caio: ["wrong", "wrong"], Dani: ["right", "wrong"] },
			}),
		);

		const { items, total } = await list();

		expect(total).toBe(2);
		expect(
			items.map(({ gameId, name, participantCount, accuracyPercent }) => ({
				gameId,
				name,
				participantCount,
				accuracyPercent,
			})),
		).toEqual([
			{
				gameId: "game-2",
				name: "Capitais",
				participantCount: 3,
				accuracyPercent: 17,
			},
			{
				gameId: "game-1",
				name: "Capitais",
				participantCount: 2,
				accuracyPercent: 100,
			},
		]);
	});

	it("search ignores case and accents", async () => {
		const { list } = setup(
			named("game-1", "Capitais"),
			named("game-2", "História do Brasil"),
			named("game-3", "Química"),
		);

		expect(
			(await list({ search: "quimica" })).items.map(({ name }) => name),
		).toEqual(["Química"]);
		expect(await list({ search: "  HISTORIA " })).toMatchObject({ total: 1 });
		expect(await list({ search: "xyz" })).toEqual({ items: [], total: 0 });
		expect(await list({ search: "   " })).toMatchObject({ total: 3 });
	});

	it("limit cuts the list and total tells how many there are", async () => {
		const games = Array.from({ length: 25 }, (_, index) =>
			named(`game-${index}`, `Quiz ${index}`, {
				endedAt: new Date(Date.UTC(2026, 5, 1, 12, index)),
			}),
		);
		const { list } = setup(...games);

		const first = await list({ limit: 20 });
		const all = await list({ limit: 40 });

		expect(first.items).toHaveLength(20);
		expect(first.total).toBe(25);
		// Newest first.
		expect(first.items[0]?.name).toBe("Quiz 24");
		expect(all.items).toHaveLength(25);
	});

	it("the trash section lists only trashed reports", async () => {
		const { list } = setup(
			named("game-1", "Capitais"),
			named("game-2", "Química", { trashedAt: day(15) }),
		);

		expect((await list()).items.map(({ name }) => name)).toEqual(["Capitais"]);
		expect(
			(await list({ section: "trash" })).items.map(({ name, trashedAt }) => ({
				name,
				trashedAt,
			})),
		).toEqual([{ name: "Química", trashedAt: day(15) }]);
	});

	it("another creator's reports are not listed", async () => {
		const { list } = setup(named("game-1", "Capitais", { ownerId: "user-2" }));

		expect(await list()).toEqual({ items: [], total: 0 });
	});

	it("play again needs a quiz out of the trash with a playable version", async () => {
		const quiz = { trashed: false, playable: true, coverImageKey: null };
		const { list } = setup(
			named("game-1", "A", { endedAt: day(14), quiz }),
			named("game-2", "B", {
				endedAt: day(13),
				quiz: { ...quiz, trashed: true },
			}),
			named("game-3", "C", {
				endedAt: day(12),
				quiz: { ...quiz, playable: false },
			}),
			named("game-4", "D", { endedAt: day(11), quiz: null }),
		);

		expect(
			(await list()).items.map(({ canPlayAgain, quizId }) => ({
				canPlayAgain,
				quizId,
			})),
		).toEqual([
			{ canPlayAgain: true, quizId: "quiz-1" },
			{ canPlayAgain: false, quizId: null },
			{ canPlayAgain: false, quizId: "quiz-1" },
			{ canPlayAgain: false, quizId: null },
		]);
	});

	it("the cover is the quiz's while it exists", async () => {
		const { list, storage } = setup(
			named("game-1", "A", {
				endedAt: day(14),
				quiz: { trashed: false, playable: true, coverImageKey: "covers/a.png" },
			}),
			named("game-2", "B", { endedAt: day(13), quiz: null }),
		);

		expect((await list()).items.map(({ coverUrl }) => coverUrl)).toEqual([
			storage.getPublicUrl("covers/a.png"),
			null,
		]);
	});
});
