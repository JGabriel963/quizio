import { describe, expect, it } from "vitest";

import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { GameNotFoundError } from "../domain/game";
import { aGame, aPlayer } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createCreateAssignment } from "./create-assignment";
import { createEndAssignment } from "./end-assignment";
import { createGetAssignmentCover } from "./get-assignment-cover";

const DAY_MS = 24 * 60 * 60 * 1000;

async function withAssignment() {
	const deps = createGameDeps();
	const { gameId } = await createCreateAssignment(deps)({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: new Date(deps.clock.now().getTime() + 2 * DAY_MS),
		options: DEFAULT_ASSIGNMENT_OPTIONS,
	});
	deps.assignmentLanding.creatorNames.set("user-1", "Ana");
	deps.assignmentLanding.covers.set("quiz-1", "media/user-1/cover.png");
	return { deps, gameId };
}

describe("getAssignmentCover theme (spec 042, RN-15)", () => {
	it("the cover carries the assignment's theme, open or ended", async () => {
		const { deps, gameId } = await withAssignment();
		const game = await deps.games.findById(gameId);
		if (!game) {
			throw new Error("The assignment should exist");
		}
		await deps.games.save({ ...game, themeId: "lilac" });
		const getCover = createGetAssignmentCover(deps);

		expect((await getCover({ gameId })).themeId).toBe("lilac");
		deps.clock.advanceBy(3 * DAY_MS);
		expect((await getCover({ gameId })).themeId).toBe("lilac");
	});
});

describe("getAssignmentCover (spec 029, RN-46 to RN-48; spec 030, RN-01)", () => {
	it("an open assignment gives its name, its creator, the time left and the participants", async () => {
		const { deps, gameId } = await withAssignment();
		await deps.players.save(aPlayer({ gameId, nickname: "John" }));
		deps.clock.advanceBy(DAY_MS);

		expect(await createGetAssignmentCover(deps)({ gameId })).toEqual({
			status: "open",
			name: "Bom de Bíblia (Junho)",
			creatorName: "Ana",
			remainingMs: DAY_MS,
			participantCount: 1,
			participants: ["John"],
			coverUrl: "https://media.test/media/user-1/cover.png",
			questionCount: 2,
			themeId: "standard",
		});
	});

	it("past its deadline it is ended, without writing", async () => {
		const { deps, gameId } = await withAssignment();
		deps.clock.advanceBy(3 * DAY_MS);

		expect(await createGetAssignmentCover(deps)({ gameId })).toEqual({
			status: "ended",
			name: "Bom de Bíblia (Junho)",
			themeId: "standard",
		});
		expect((await deps.games.findById(gameId))?.endedAt).toBeNull();
	});

	it("an ended assignment gives only its name", async () => {
		const { deps, gameId } = await withAssignment();
		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		expect(await createGetAssignmentCover(deps)({ gameId })).toEqual({
			status: "ended",
			name: "Bom de Bíblia (Junho)",
			themeId: "standard",
		});
	});

	it("a renamed report renames the activity", async () => {
		const { deps, gameId } = await withAssignment();
		deps.assignmentLanding.reportNames.set(gameId, "Capitais — Turma A");

		expect((await createGetAssignmentCover(deps)({ gameId })).name).toBe(
			"Capitais — Turma A",
		);
	});

	it("gives nothing about the questions", async () => {
		const { deps, gameId } = await withAssignment();

		const view = await createGetAssignmentCover(deps)({ gameId });

		expect(Object.keys(view).sort()).toEqual([
			"coverUrl",
			"creatorName",
			"name",
			"participantCount",
			"participants",
			"questionCount",
			"remainingMs",
			"status",
			"themeId",
		]);
	});

	it("an unknown id or a live game is missing", async () => {
		const deps = createGameDeps();
		await deps.games.save(aGame());
		const landing = createGetAssignmentCover(deps);

		await expect(landing({ gameId: "nope" })).rejects.toThrow(
			GameNotFoundError,
		);
		await expect(landing({ gameId: "game-1" })).rejects.toThrow(
			GameNotFoundError,
		);
	});
});
