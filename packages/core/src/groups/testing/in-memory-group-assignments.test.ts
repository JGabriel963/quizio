import { describe, expect, it } from "vitest";

import { InMemoryGroupAssignments } from "./in-memory-group-assignments";

const deadline = new Date("2026-10-29T12:00:00.000Z");
const options = {
	gameCharacters: false,
	questionTimer: true,
	randomizeAnswers: false,
};

describe("InMemoryGroupAssignments (spec 038)", () => {
	it("finds the assignments it created, ended or not, and forgets deleted ones", async () => {
		const assignments = new InMemoryGroupAssignments();
		assignments.addQuiz({
			id: "quiz-1",
			ownerId: "ana",
			ownerName: "Ana",
			title: "Capitais",
			questionCount: 5,
			coverImageKey: "media/ana/c.png",
		});

		const first = await assignments.create({
			ownerId: "ana",
			quizId: "quiz-1",
			deadline,
			options,
		});
		const second = await assignments.create({
			ownerId: "ana",
			quizId: "quiz-1",
			deadline,
			options,
		});
		assignments.end(first.gameId, new Date("2026-10-27T12:00:00.000Z"));
		assignments.remove(second.gameId);

		expect(
			await assignments.findAssignments([first.gameId, second.gameId]),
		).toEqual([
			{
				gameId: first.gameId,
				ownerId: "ana",
				ownerName: "Ana",
				name: "Capitais",
				questionCount: 5,
				coverImageKey: "media/ana/c.png",
				expiresAt: deadline,
				endedAt: new Date("2026-10-27T12:00:00.000Z"),
			},
		]);
		expect(assignments.created).toEqual([
			{ ownerId: "ana", quizId: "quiz-1", deadline, options },
			{ ownerId: "ana", quizId: "quiz-1", deadline, options },
		]);
	});

	it("refuses a quiz of somebody else, and the error it was told to throw", async () => {
		const assignments = new InMemoryGroupAssignments();
		const refusal = new Error("deadline");

		await expect(
			assignments.create({ ownerId: "ana", quizId: "nope", deadline, options }),
		).rejects.toThrow();
		assignments.refuseNext(refusal);
		await expect(
			assignments.create({ ownerId: "ana", quizId: "nope", deadline, options }),
		).rejects.toBe(refusal);
	});
});
