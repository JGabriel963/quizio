import { describe, expect, it } from "vitest";

import { aGame, aPlayingGame } from "./a-game";
import { InMemoryGameRepository } from "./in-memory-game-repository";

describe("InMemoryGameRepository", () => {
	it("deletes the games of a quiz that never started and keeps the started ones (spec 015)", async () => {
		const games = new InMemoryGameRepository();
		await games.save(aGame({ id: "lobby", pin: "111111" }));
		await games.save(
			aGame({
				id: "ended-in-lobby",
				pin: "222222",
				status: "ended",
				endedAt: new Date("2026-06-01T12:05:00.000Z"),
				endReason: "host",
			}),
		);
		await games.save(
			aPlayingGame("results", {}, { id: "playing", pin: "333333" }),
		);
		await games.save(
			aGame({
				id: "finished",
				pin: "444444",
				status: "finished",
				questionCount: 3,
				endedAt: new Date("2026-06-01T12:30:00.000Z"),
			}),
		);
		await games.save(
			aGame({ id: "other-quiz", pin: "555555", quizId: "quiz-2" }),
		);

		await games.deleteUnstartedByQuiz("quiz-1");

		expect(games.all().map(({ id }) => id)).toEqual([
			"playing",
			"finished",
			"other-quiz",
		]);
	});
});

describe("InMemoryGameRepository with assignments (spec 029)", () => {
	const assignment = (id: string, pin: string, overrides = {}) =>
		aGame({
			id,
			pin,
			mode: "assignment",
			status: "playing",
			questionCount: 2,
			...overrides,
		});

	it("two open assignments of one quiz are created", async () => {
		const games = new InMemoryGameRepository();

		expect(await games.create(assignment("a-1", "00000001"))).toBe("created");
		expect(await games.create(assignment("a-2", "00000002"))).toBe("created");
	});

	it("a live game and an assignment of one quiz are both created", async () => {
		const games = new InMemoryGameRepository();

		expect(await games.create(aGame({ id: "live" }))).toBe("created");
		expect(await games.create(assignment("a-1", "00000001"))).toBe("created");
	});

	it("a second open live game of one quiz is taken", async () => {
		const games = new InMemoryGameRepository();
		await games.create(aGame({ id: "live-1", pin: "111111" }));

		expect(await games.create(aGame({ id: "live-2", pin: "222222" }))).toBe(
			"taken",
		);
	});

	it("an open PIN is taken whatever the mode", async () => {
		const games = new InMemoryGameRepository();
		await games.create(assignment("a-1", "00000001"));

		expect(await games.create(assignment("a-2", "00000001"))).toBe("taken");
	});

	it("listUnendedByQuiz filters by mode", async () => {
		const games = new InMemoryGameRepository();
		await games.create(aGame({ id: "live" }));
		await games.create(assignment("a-1", "00000001"));

		expect(
			(await games.listUnendedByQuiz("quiz-1", ["live"])).map(({ id }) => id),
		).toEqual(["live"]);
		expect(
			(await games.listUnendedByQuiz("quiz-1")).map(({ id }) => id),
		).toEqual(["live", "a-1"]);
	});

	it("findLatestAssignmentByPin finds the newest assignment with the PIN, ended or not", async () => {
		const games = new InMemoryGameRepository();
		await games.save(
			assignment("old", "00000001", {
				createdAt: new Date("2026-06-01T12:00:00.000Z"),
				status: "ended",
				endedAt: new Date("2026-06-02T12:00:00.000Z"),
			}),
		);
		await games.save(
			assignment("new", "00000001", {
				createdAt: new Date("2026-06-03T12:00:00.000Z"),
				status: "ended",
				endedAt: new Date("2026-06-04T12:00:00.000Z"),
			}),
		);
		await games.save(aGame({ id: "live", pin: "00000001" }));

		expect((await games.findLatestAssignmentByPin("00000001"))?.id).toBe("new");
		expect(await games.findLatestAssignmentByPin("00000002")).toBeNull();
	});

	it("saveDeadline writes only the deadline of a game that did not end", async () => {
		const games = new InMemoryGameRepository();
		const deadline = new Date("2026-06-10T12:00:00.000Z");
		await games.save(assignment("open", "00000001"));
		await games.save(
			assignment("ended", "00000002", {
				status: "ended",
				endedAt: new Date("2026-06-02T12:00:00.000Z"),
			}),
		);

		expect(await games.saveDeadline("open", deadline)).toBe(true);
		expect(await games.saveDeadline("ended", deadline)).toBe(false);
		expect((await games.findById("open"))?.expiresAt).toEqual(deadline);
		expect((await games.findById("ended"))?.expiresAt).not.toEqual(deadline);
	});

	describe("the answer review (spec 031)", () => {
		const at = new Date("2026-06-01T12:01:00.000Z");
		const from = { questionIndex: 0, phase: "results" } as const;

		it("saveReview writes the instants only while at from", async () => {
			const games = new InMemoryGameRepository();
			await games.save(aPlayingGame("results"));

			expect(
				await games.saveReview("game-1", from, {
					openedAt: at,
					closedAt: null,
				}),
			).toBe(true);
			expect((await games.findById("game-1"))?.progress).toMatchObject({
				phase: "results",
				reviewOpenedAt: at,
				reviewClosedAt: null,
			});
			expect(
				await games.saveReview(
					"game-1",
					{ questionIndex: 1, phase: "results" },
					{ openedAt: null, closedAt: at },
				),
			).toBe(false);
		});

		it("saveIfAt clears the review instants", async () => {
			const games = new InMemoryGameRepository();
			const results = aPlayingGame("results");
			await games.save(results);
			await games.saveReview("game-1", from, { openedAt: at, closedAt: null });

			await games.saveIfAt(aPlayingGame("scoreboard", { since: at }), from);

			const progress = (await games.findById("game-1"))?.progress;
			expect(progress?.reviewOpenedAt ?? null).toBeNull();
			expect(progress?.reviewClosedAt ?? null).toBeNull();
		});
	});
});

describe("one open live game per quiz and host (spec 037, RN-19)", () => {
	it("two hosts keep their games of the same quiz; listUnendedByQuiz filters by owner", async () => {
		const games = new InMemoryGameRepository();

		expect(await games.create(aGame({ id: "a", pin: "111111" }))).toBe(
			"created",
		);
		expect(
			await games.create(aGame({ id: "b", pin: "222222", ownerId: "user-2" })),
		).toBe("created");
		expect(await games.create(aGame({ id: "c", pin: "333333" }))).toBe("taken");
		expect(
			(await games.listUnendedByQuiz("quiz-1", ["live"], "user-2")).map(
				({ id }) => id,
			),
		).toEqual(["b"]);
	});
});
