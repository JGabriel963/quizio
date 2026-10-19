import { describe, expect, it } from "vitest";

import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { GameNotFoundError } from "../domain/game";
import { aGame, aPlayer } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createCreateAssignment } from "./create-assignment";
import { createEndAssignment } from "./end-assignment";
import { createGetAssignmentLanding } from "./get-assignment-landing";

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
	return { deps, gameId };
}

describe("getAssignmentLanding (spec 029, RN-46 to RN-48)", () => {
	it("an open assignment gives its name, its creator, the time left and the participants", async () => {
		const { deps, gameId } = await withAssignment();
		await deps.players.save(aPlayer({ gameId }));
		deps.clock.advanceBy(DAY_MS);

		expect(await createGetAssignmentLanding(deps)({ gameId })).toEqual({
			status: "open",
			name: "Bom de Bíblia (Junho)",
			creatorName: "Ana",
			remainingMs: DAY_MS,
			participantCount: 1,
		});
	});

	it("past its deadline it is ended, without writing", async () => {
		const { deps, gameId } = await withAssignment();
		deps.clock.advanceBy(3 * DAY_MS);

		expect(await createGetAssignmentLanding(deps)({ gameId })).toEqual({
			status: "ended",
			name: "Bom de Bíblia (Junho)",
		});
		expect((await deps.games.findById(gameId))?.endedAt).toBeNull();
	});

	it("an ended assignment gives only its name", async () => {
		const { deps, gameId } = await withAssignment();
		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		expect(await createGetAssignmentLanding(deps)({ gameId })).toEqual({
			status: "ended",
			name: "Bom de Bíblia (Junho)",
		});
	});

	it("a renamed report renames the activity", async () => {
		const { deps, gameId } = await withAssignment();
		deps.assignmentLanding.reportNames.set(gameId, "Capitais — Turma A");

		expect((await createGetAssignmentLanding(deps)({ gameId })).name).toBe(
			"Capitais — Turma A",
		);
	});

	it("gives nothing about the questions", async () => {
		const { deps, gameId } = await withAssignment();

		const view = await createGetAssignmentLanding(deps)({ gameId });

		expect(Object.keys(view).sort()).toEqual([
			"creatorName",
			"name",
			"participantCount",
			"remainingMs",
			"status",
		]);
	});

	it("an unknown id or a live game is missing", async () => {
		const deps = createGameDeps();
		await deps.games.save(aGame());
		const landing = createGetAssignmentLanding(deps);

		await expect(landing({ gameId: "nope" })).rejects.toThrow(
			GameNotFoundError,
		);
		await expect(landing({ gameId: "game-1" })).rejects.toThrow(
			GameNotFoundError,
		);
	});
});
