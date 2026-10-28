import { describe, expect, it } from "vitest";

import { connectTestClient } from "../testing/connect-test-client";
import { groupOf, publishedQuiz } from "../testing/fixtures";

// The test API's clock reads 2026-06-01T12:00:00.000Z; the limit is 28 days.
const IN_28_DAYS = "2026-06-29T09:00:00-03:00";

describe("assignment tools (spec 044, RN-27)", () => {
	it("create_assignment with a deadline 28 days ahead and no timer gives the link and the 8-digit PIN", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const quizId = await publishedQuiz(ana);

		const created = await ana.ok("create_assignment", {
			quizId,
			deadline: IN_28_DAYS,
			options: { questionTimer: false },
		});

		const assignment = created.assignment as { gameId: string; pin: string };
		expect(assignment).toMatchObject({
			deadline: "2026-06-29T12:00:00.000Z",
			// What was not sent comes from the person's last choices.
			options: {
				questionTimer: false,
				gameCharacters: false,
				randomizeAnswers: false,
			},
		});
		expect(assignment.pin).toMatch(/^\d{8}$/);
		expect(created.links).toEqual({
			participants: `https://quizio.test/assignment/${assignment.gameId}`,
			join: `https://quizio.test/join/${assignment.pin}`,
			report: `https://quizio.test/reports/${assignment.gameId}`,
		});
	});

	it("29 days ahead and in the past are refused with the rule", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const quizId = await publishedQuiz(ana);

		const tooFar = await ana.call("create_assignment", {
			quizId,
			deadline: "2026-06-30T12:00:00Z",
		});
		const passed = await ana.call("create_assignment", {
			quizId,
			deadline: "2026-05-31T12:00:00Z",
		});

		expect(tooFar.data.error).toEqual({
			code: "ASSIGNMENT.DEADLINE_TOO_FAR",
			message: "The deadline must be at most 28 days ahead",
		});
		expect(passed.data.error).toMatchObject({
			code: "ASSIGNMENT.DEADLINE_PASSED",
		});
	});

	it("a quiz never published cannot be assigned", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const { quiz } = (await ana.ok("create_quiz", { title: "Rascunho" })) as {
			quiz: { id: string };
		};

		const refused = await ana.call("create_assignment", {
			quizId: quiz.id,
			deadline: IN_28_DAYS,
		});

		expect(refused.data.error).toMatchObject({
			code: "GAME.QUIZ_NOT_PLAYABLE",
		});
	});

	it("change_assignment_deadline, then end_assignment", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const quizId = await publishedQuiz(ana);
		const { gameId } = (
			await ana.ok("create_assignment", { quizId, deadline: IN_28_DAYS })
		).assignment as { gameId: string };

		const changed = await ana.ok("change_assignment_deadline", {
			gameId,
			deadline: "2026-06-10T20:00:00-03:00",
		});
		expect(changed.assignment).toEqual({
			gameId,
			deadline: "2026-06-10T23:00:00.000Z",
		});
		expect((await ana.api.games.findById(gameId))?.expiresAt).toEqual(
			new Date("2026-06-10T23:00:00.000Z"),
		);

		const ended = await ana.ok("end_assignment", { gameId });

		expect(ended.links).toEqual({
			report: `https://quizio.test/reports/${gameId}`,
		});
		expect((await ana.api.games.findById(gameId))?.endedAt).not.toBeNull();
	});

	it("assign_to_groups posts in the groups where the caller may assign", async () => {
		const ana = await connectTestClient({ userId: "ana" });
		const quizId = await publishedQuiz(ana);
		const { gameId } = (
			await ana.ok("create_assignment", { quizId, deadline: IN_28_DAYS })
		).assignment as { gameId: string };
		const own = await groupOf(ana.api, "ana", [], "Turma A");
		// Members may not assign in a group by default (spec 035).
		const others = await groupOf(ana.api, "bruno", ["ana"], "Turma B");

		const refused = await ana.call("assign_to_groups", {
			gameId,
			groupIds: [own, others],
		});
		expect(refused.data.error).toMatchObject({
			code: "GROUP.ASSIGN_NOT_ALLOWED",
		});

		const assigned = await ana.ok("assign_to_groups", {
			gameId,
			groupIds: [own],
		});

		expect(assigned).toEqual({
			assigned: 1,
			groups: [{ id: own, name: "Turma A", alreadyAssigned: true }],
		});
	});
});
