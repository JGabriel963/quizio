import { describe, expect, it } from "vitest";

import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { GameNotFoundError } from "../domain/game";
import { ParticipantNotFoundError } from "../domain/participant-progress";
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
		gameId,
		nickname: "Joân",
	});
	const progressOf = async () =>
		(await deps.players.findById(joined.playerId))?.progress;
	return {
		deps,
		gameId,
		joined,
		progressOf,
		resume: createResumeAssignment(deps),
	};
}

describe("resumeAssignment (spec 030, RN-20 to RN-22)", () => {
	it("resumes the participant by nickname, whatever the case and accents", async () => {
		const { gameId, joined, resume } = await withParticipant();

		expect(await resume({ gameId, nickname: " joan " })).toEqual(joined);
	});

	it("a question left unanswered starts again with its whole time", async () => {
		const { deps, gameId, progressOf, resume } = await withParticipant();
		deps.clock.advanceBy(6_000);

		await resume({ gameId, nickname: "Joân" });

		expect(await progressOf()).toEqual({
			questionIndex: 0,
			phase: "answering",
			startedAt: deps.clock.now(),
		});
	});

	it("also past its time, when nobody was there to see it run out", async () => {
		const { deps, gameId, progressOf, resume } = await withParticipant();
		deps.clock.advanceBy(60_000);

		await resume({ gameId, nickname: "Joân" });

		expect(await progressOf()).toMatchObject({
			phase: "answering",
			startedAt: deps.clock.now(),
		});
	});

	it("a question whose time ran out on the screen stays unanswered", async () => {
		const { deps, gameId, joined, progressOf, resume } =
			await withParticipant();
		deps.clock.advanceBy(60_000);
		await createGetAssignmentPlay(deps)({ gameId, ...joined });
		const settled = await progressOf();

		await resume({ gameId, nickname: "Joân" });

		expect(settled?.phase).toBe("results");
		expect(await progressOf()).toEqual(settled);
	});

	it("an answered question goes on from its results", async () => {
		const { deps, gameId, joined, progressOf, resume } =
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

		await resume({ gameId, nickname: "Joân" });

		expect(await progressOf()).toEqual(answered);
	});

	it("an ended activity is resumed to its end, with nothing started again", async () => {
		const { deps, gameId, progressOf, resume } = await withParticipant();
		const before = await progressOf();
		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		await resume({ gameId, nickname: "Joân" });

		expect(await progressOf()).toEqual(before);
	});

	it("refuses a nickname nobody has, and a missing activity", async () => {
		const { gameId, resume } = await withParticipant();

		await expect(resume({ gameId, nickname: "Bia" })).rejects.toThrow(
			ParticipantNotFoundError,
		);
		await expect(
			resume({ gameId: "missing", nickname: "Joân" }),
		).rejects.toThrow(GameNotFoundError);
	});
});
