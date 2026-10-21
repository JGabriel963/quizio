import { describe, expect, it } from "vitest";

import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { aPlayer } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createCreateAssignment } from "./create-assignment";
import { createEndAssignment } from "./end-assignment";
import { createHostGame } from "./host-game";
import { createListOpenAssignments } from "./list-open-assignments";

const DAY_MS = 24 * 60 * 60 * 1000;

async function withAssignments() {
	const deps = createGameDeps({
		assignmentPins: ["00000001", "00000002", "00000003"],
	});
	const create = createCreateAssignment(deps);
	const inDays = (days: number) =>
		new Date(deps.clock.now().getTime() + days * DAY_MS);
	const later = await create({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: inDays(3),
		options: DEFAULT_ASSIGNMENT_OPTIONS,
	});
	const sooner = await create({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: inDays(2),
		options: DEFAULT_ASSIGNMENT_OPTIONS,
	});
	return { deps, create, inDays, later, sooner };
}

describe("listOpenAssignments (spec 029, RN-05a)", () => {
	it("lists the quiz's open assignments, the one ending first on top", async () => {
		const { deps, later, sooner } = await withAssignments();
		await deps.players.save(aPlayer({ gameId: sooner.gameId }));
		deps.assignmentLanding.reportNames.set(later.gameId, "Turma B");

		expect(
			await createListOpenAssignments(deps)({
				ownerId: "user-1",
				quizId: "quiz-1",
			}),
		).toEqual([
			{
				gameId: sooner.gameId,
				name: "Bom de Bíblia (Junho)",
				pin: "00000002",
				deadline: new Date(deps.clock.now().getTime() + 2 * DAY_MS),
				remainingMs: 2 * DAY_MS,
				participantCount: 1,
			},
			{
				gameId: later.gameId,
				name: "Turma B",
				pin: "00000001",
				deadline: new Date(deps.clock.now().getTime() + 3 * DAY_MS),
				remainingMs: 3 * DAY_MS,
				participantCount: 0,
			},
		]);
	});

	it("leaves out the ended ones, the ones past their deadline and the live game", async () => {
		const { deps, later, sooner } = await withAssignments();
		await createHostGame(deps)({ ownerId: "user-1", quizId: "quiz-1" });
		await createEndAssignment(deps)({
			ownerId: "user-1",
			gameId: later.gameId,
		});
		deps.clock.advanceBy(2 * DAY_MS);

		expect(
			await createListOpenAssignments(deps)({
				ownerId: "user-1",
				quizId: "quiz-1",
			}),
		).toEqual([]);
		expect((await deps.games.findById(sooner.gameId))?.endReason).toBe(
			"expired",
		);
	});

	it("gives nothing for another creator's quiz", async () => {
		const { deps } = await withAssignments();

		expect(
			await createListOpenAssignments(deps)({
				ownerId: "user-2",
				quizId: "quiz-1",
			}),
		).toEqual([]);
	});
});
