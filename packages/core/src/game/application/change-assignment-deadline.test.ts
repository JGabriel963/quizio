import { describe, expect, it } from "vitest";

import {
	AssignmentDeadlinePassedError,
	AssignmentDeadlineTooFarError,
	DEFAULT_ASSIGNMENT_OPTIONS,
} from "../domain/assignment";
import { GameEndedError, GameNotFoundError } from "../domain/game";
import { createGameDeps } from "../testing/game-deps";
import { InMemoryGameRepository } from "../testing/in-memory-game-repository";
import { createChangeAssignmentDeadline } from "./change-assignment-deadline";
import { createCreateAssignment } from "./create-assignment";
import { createHostGame } from "./host-game";

const DAY_MS = 24 * 60 * 60 * 1000;
const start = new Date("2026-06-01T12:00:00.000Z");
const inDays = (days: number) => new Date(start.getTime() + days * DAY_MS);

async function anOpenAssignment() {
	const deps = createGameDeps();
	const { gameId } = await createCreateAssignment(deps)({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: inDays(3),
		options: DEFAULT_ASSIGNMENT_OPTIONS,
	});
	return { deps, gameId };
}

describe("changeAssignmentDeadline (spec 029, RN-36 to RN-38)", () => {
	it("stores a later deadline", async () => {
		const { deps, gameId } = await anOpenAssignment();

		await createChangeAssignmentDeadline(deps)({
			ownerId: "user-1",
			gameId,
			deadline: inDays(10),
		});

		expect((await deps.games.findById(gameId))?.expiresAt).toEqual(inDays(10));
	});

	it("stores an earlier deadline", async () => {
		const { deps, gameId } = await anOpenAssignment();

		await createChangeAssignmentDeadline(deps)({
			ownerId: "user-1",
			gameId,
			deadline: inDays(1),
		});

		expect((await deps.games.findById(gameId))?.expiresAt).toEqual(inDays(1));
	});

	it("refuses a deadline out of bounds and keeps the old one", async () => {
		const { deps, gameId } = await anOpenAssignment();
		const change = createChangeAssignmentDeadline(deps);

		await expect(
			change({ ownerId: "user-1", gameId, deadline: inDays(-1) }),
		).rejects.toThrow(AssignmentDeadlinePassedError);
		await expect(
			change({ ownerId: "user-1", gameId, deadline: inDays(29) }),
		).rejects.toThrow(AssignmentDeadlineTooFarError);
		expect((await deps.games.findById(gameId))?.expiresAt).toEqual(inDays(3));
	});

	it("refuses an assignment that ended by its deadline", async () => {
		const { deps, gameId } = await anOpenAssignment();
		deps.clock.advanceBy(4 * DAY_MS);

		await expect(
			createChangeAssignmentDeadline(deps)({
				ownerId: "user-1",
				gameId,
				deadline: inDays(10),
			}),
		).rejects.toThrow(GameEndedError);
		expect((await deps.games.findById(gameId))?.endReason).toBe("expired");
	});

	it("refuses an assignment ended meanwhile (saveDeadline false)", async () => {
		const { deps, gameId } = await anOpenAssignment();
		// Someone ends it between the read and the write.
		const games = new (class extends InMemoryGameRepository {
			override async saveDeadline(): Promise<boolean> {
				return false;
			}
		})();
		for (const game of deps.games.all()) {
			await games.save(game);
		}

		await expect(
			createChangeAssignmentDeadline({ ...deps, games })({
				ownerId: "user-1",
				gameId,
				deadline: inDays(10),
			}),
		).rejects.toThrow(GameEndedError);
	});

	it("refuses another creator's assignment and a live game as missing", async () => {
		const { deps, gameId } = await anOpenAssignment();
		const change = createChangeAssignmentDeadline(deps);
		const { gameId: liveId } = await createHostGame(deps)({
			ownerId: "user-1",
			quizId: "quiz-1",
		});

		await expect(
			change({ ownerId: "user-2", gameId, deadline: inDays(5) }),
		).rejects.toThrow(GameNotFoundError);
		await expect(
			change({ ownerId: "user-1", gameId: liveId, deadline: inDays(5) }),
		).rejects.toThrow(GameNotFoundError);
	});
});
