import { describe, expect, it } from "vitest";

import type { Question } from "../../quiz/domain/question";
import { aQuestion } from "../../quiz/testing/a-question";
import { AnswersClosedError } from "../domain/answer";
import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { GameEndedError } from "../domain/game";
import { ParticipantNotAtStageError } from "../domain/participant-progress";
import { createGameDeps } from "../testing/game-deps";
import { createAnswerAssignmentQuestion } from "./answer-assignment-question";
import { createCreateAssignment } from "./create-assignment";
import { createEndAssignment } from "./end-assignment";
import { createJoinAssignment } from "./join-assignment";

const DAY_MS = 24 * 60 * 60 * 1000;

async function playing(options = {}, questions?: Question[]) {
	const deps = createGameDeps({ questions });
	const { gameId } = await createCreateAssignment(deps)({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: new Date(deps.clock.now().getTime() + 3 * DAY_MS),
		options: { ...DEFAULT_ASSIGNMENT_OPTIONS, ...options },
	});
	const john = await createJoinAssignment(deps)({ gameId, nickname: "John" });
	const participant = { gameId, playerId: john.playerId, secret: john.secret };
	const answer = (choiceIds: string[], questionIndex = 0) =>
		createAnswerAssignmentQuestion(deps)({
			...participant,
			questionIndex,
			choiceIds,
		});
	return { deps, gameId, john, answer };
}

describe("answerAssignmentQuestion (spec 030, RN-10, RN-11, RN-13)", () => {
	it("a right answer in 2 s of 20 is worth 950 and goes to the results", async () => {
		const { deps, gameId, john, answer } = await playing();
		deps.clock.advanceBy(2000);

		const view = await answer(["choice-1"]);

		expect(view.screen).toMatchObject({
			phase: "results",
			total: 950,
			result: {
				result: "correct",
				chosenIds: ["choice-1"],
				rightIds: ["choice-1"],
				points: 950,
			},
		});
		expect(await deps.answers.find(gameId, 0, john.playerId)).toMatchObject({
			responseTimeMs: 2000,
			points: 950,
		});
	});

	it("a wrong answer is worth nothing and reveals the right one", async () => {
		const { answer } = await playing();

		const view = await answer(["choice-2"]);

		expect(view.screen).toMatchObject({
			phase: "results",
			total: 0,
			result: { result: "wrong", rightIds: ["choice-1"], points: 0 },
		});
	});

	it("without the timer a right answer is worth the full points", async () => {
		const { deps, answer } = await playing({ questionTimer: false });
		deps.clock.advanceBy(5 * 60_000);

		expect((await answer(["choice-1"])).screen).toMatchObject({
			result: { points: 1000 },
		});
	});

	it("multiple selection counts per right answer", async () => {
		const { answer } = await playing({}, [
			aQuestion({
				id: "question-1",
				selection: "multiple",
				choices: ["A", "B", "C", "D"].map((text, index) => ({
					id: `choice-${index + 1}`,
					text,
					correct: index < 2,
				})),
			}),
		]);

		expect((await answer(["choice-1"])).screen).toMatchObject({
			result: { result: "partiallyCorrect" },
		});
	});

	it("an answer past the deadline is refused and the results show", async () => {
		const { deps, john, answer } = await playing();
		deps.clock.advanceBy(21_000);

		await expect(answer(["choice-1"])).rejects.toThrow(AnswersClosedError);
		expect((await deps.players.findById(john.playerId))?.progress?.phase).toBe(
			"results",
		);
	});

	it("an answer to another question is refused", async () => {
		const { answer } = await playing();

		await expect(answer(["true"], 1)).rejects.toThrow(
			ParticipantNotAtStageError,
		);
	});

	it("a second answer is refused", async () => {
		const { answer } = await playing();
		await answer(["choice-1"]);

		await expect(answer(["choice-2"])).rejects.toThrow(
			ParticipantNotAtStageError,
		);
	});

	it("an answer after the activity ended is refused", async () => {
		const { deps, gameId, answer } = await playing();
		await createEndAssignment(deps)({ ownerId: "user-1", gameId });

		await expect(answer(["choice-1"])).rejects.toThrow(GameEndedError);
	});
});
