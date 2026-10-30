import { describe, expect, it } from "vitest";

import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { GameNotFoundError } from "../domain/game";
import { aGame, aPlayer } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { createAnswerAssignmentQuestion } from "./answer-assignment-question";
import { createCreateAssignment } from "./create-assignment";
import { createEndAssignment } from "./end-assignment";
import { createGetAssignmentPlay } from "./get-assignment-play";
import { createJoinAssignment } from "./join-assignment";
import { createResumeAssignment } from "./resume-assignment";

const DAY_MS = 24 * 60 * 60 * 1000;

async function withParticipant() {
	const deps = createGameDeps();
	const { gameId } = await createCreateAssignment(deps)({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: new Date(deps.clock.now().getTime() + 3 * DAY_MS),
		options: DEFAULT_ASSIGNMENT_OPTIONS,
	});
	const joined = await createJoinAssignment(deps)({
		clientKey: "ip",
		gameId,
		nickname: "Joân",
	});
	const progressOf = async () =>
		(await deps.players.findById(joined.playerId))?.progress;
	/** The pair this browser kept when it joined (RN-20). */
	const kept = { gameId, playerId: joined.playerId, secret: joined.secret };
	return {
		deps,
		gameId,
		joined,
		kept,
		progressOf,
		resume: createResumeAssignment(deps),
	};
}

describe("resumeAssignment (spec 030, RN-20 to RN-22)", () => {
	it("goes on with the pair the browser kept", async () => {
		const { kept, resume } = await withParticipant();

		await expect(resume(kept)).resolves.toBeUndefined();
	});

	it("a question left unanswered goes on with the time it had left (RN-21, M6)", async () => {
		const { deps, gameId, joined, kept, progressOf, resume } =
			await withParticipant();
		const left = await progressOf();
		deps.clock.advanceBy(6_000);

		await resume(kept);

		expect(await progressOf()).toEqual(left);
		const { screen } = await createGetAssignmentPlay(deps)({
			gameId,
			...joined,
		});
		if (screen.phase !== "answering" || screen.durationMs === null) {
			throw new Error("Expected a question with the timer");
		}
		expect(screen.remainingMs).toBe(screen.durationMs - 6_000);
	});

	it("a question whose time ran out while away counts as unanswered (RN-21, M6)", async () => {
		const { deps, gameId, joined, kept, progressOf, resume } =
			await withParticipant();
		deps.clock.advanceBy(60_000);

		await resume(kept);

		expect(await progressOf()).toMatchObject({
			questionIndex: 0,
			phase: "results",
		});
		const { screen } = await createGetAssignmentPlay(deps)({
			gameId,
			...joined,
		});
		expect(screen).toMatchObject({
			phase: "results",
			result: { result: "unanswered", points: 0 },
		});
	});

	it("a question whose time ran out on the screen stays unanswered", async () => {
		const { deps, gameId, joined, kept, progressOf, resume } =
			await withParticipant();
		deps.clock.advanceBy(60_000);
		await createGetAssignmentPlay(deps)({ gameId, ...joined });
		const settled = await progressOf();

		await resume(kept);

		expect(settled?.phase).toBe("results");
		expect(await progressOf()).toEqual(settled);
	});

	it("an answered question goes on from its results", async () => {
		const { deps, gameId, joined, kept, progressOf, resume } =
			await withParticipant();
		const question = await deps.gameQuestions.find(gameId, 0);
		await createAnswerAssignmentQuestion(deps)({
			gameId,
			...joined,
			questionIndex: 0,
			choiceIds: [question?.choices[0]?.id ?? ""],
		});
		const answered = await progressOf();
		deps.clock.advanceBy(60_000);

		await resume(kept);

		expect(await progressOf()).toEqual(answered);
	});

	it("an ended activity is resumed to its end (RN-22, RN-23)", async () => {
		const { deps, gameId, kept, progressOf, resume } = await withParticipant();
		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		await resume(kept);

		expect(await progressOf()).toMatchObject({ phase: "finished" });
	});

	it("refuses a pair that is not the participant's (M5)", async () => {
		const { deps, kept, progressOf, resume } = await withParticipant();
		const before = await progressOf();
		deps.clock.advanceBy(6_000);

		await expect(resume({ ...kept, secret: "guess" })).rejects.toThrow(
			GameNotFoundError,
		);
		await expect(resume({ ...kept, playerId: "nobody" })).rejects.toThrow(
			GameNotFoundError,
		);
		await expect(resume({ ...kept, gameId: "missing" })).rejects.toThrow(
			GameNotFoundError,
		);
		expect(await progressOf()).toEqual(before);
	});

	it("refuses a player of another activity", async () => {
		const { deps, kept, resume } = await withParticipant();
		await deps.games.save(aGame({ id: "live", pin: "111111", quizId: "q-2" }));
		await deps.players.add(
			aPlayer({ id: "p-live", gameId: "live", secret: "s-live" }),
		);

		await expect(
			resume({ ...kept, playerId: "p-live", secret: "s-live" }),
		).rejects.toThrow(GameNotFoundError);
	});
});
