import { describe, expect, it } from "vitest";
import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { GamePinNotRecognizedError } from "../domain/game";
import { PIN_ATTEMPT_WINDOW_MS } from "../domain/game-pin";
import { aGame } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createCreateAssignment } from "./create-assignment";
import { createEndAssignment } from "./end-assignment";
import { createFindGameByPin } from "./find-game-by-pin";

const DAY_MS = 24 * 60 * 60 * 1000;

async function withAssignment() {
	const deps = createGameDeps();
	const { gameId } = await createCreateAssignment(deps)({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: new Date(deps.clock.now().getTime() + 3 * DAY_MS),
		options: DEFAULT_ASSIGNMENT_OPTIONS,
	});
	return { deps, gameId };
}

describe("findGameByPin theme (spec 042, RN-14)", () => {
	it("returns the game's theme with the game", async () => {
		const deps = createGameDeps();
		await deps.games.save(aGame({ themeId: "light-green" }));

		const found = await createFindGameByPin(deps)({
			pin: "265914",
			clientKey: "ip",
		});

		expect(found.themeId).toBe("light-green");
	});
});

describe("findGameByPin with assignments (spec 029, RN-20)", () => {
	it("eight digits of an open assignment give its id and the assignment mode", async () => {
		const { deps, gameId } = await withAssignment();

		expect(
			await createFindGameByPin(deps)({ pin: "0435 2236", clientKey: "ip" }),
		).toEqual({
			gameId,
			pin: "04352236",
			mode: "assignment",
			themeId: "standard",
		});
	});

	it("eight digits of an ended assignment give its id, and the attempt is released", async () => {
		const { deps, gameId } = await withAssignment();
		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		expect(
			await createFindGameByPin(deps)({ pin: "04352236", clientKey: "ip" }),
		).toEqual({
			gameId,
			pin: "04352236",
			mode: "assignment",
			themeId: "standard",
		});
		expect(
			await deps.attempts.reserve(
				"pin:ip",
				PIN_ATTEMPT_WINDOW_MS,
				1,
				deps.clock.now(),
			),
		).toBe(true);
	});

	it("eight digits of no assignment count as a wrong PIN", async () => {
		const { deps } = await withAssignment();

		await expect(
			createFindGameByPin(deps)({ pin: "11112222", clientKey: "ip" }),
		).rejects.toThrow(GamePinNotRecognizedError);
		expect(
			await deps.attempts.reserve(
				"pin:ip",
				PIN_ATTEMPT_WINDOW_MS,
				1,
				deps.clock.now(),
			),
		).toBe(false);
	});

	it("six digits still find live games only", async () => {
		const deps = createGameDeps();
		await deps.games.save(aGame({ createdAt: deps.clock.now() }));

		expect(
			await createFindGameByPin(deps)({ pin: "265914", clientKey: "ip" }),
		).toEqual({
			gameId: "game-1",
			pin: "265914",
			mode: "live",
			themeId: "standard",
		});
	});
});
