import { describe, expect, it } from "vitest";

import { aGame } from "../testing/a-game";
import {
	ASSIGNMENT_DEFAULT_MAX_DEADLINE_DAYS,
	AssignmentDeadlinePassedError,
	AssignmentDeadlineTooFarError,
	assertAssignmentDeadline,
	changeAssignmentDeadline,
	DEFAULT_ASSIGNMENT_OPTIONS,
	newAssignment,
} from "./assignment";
import { endGame, GameEndedError, isGameOpen } from "./game";

const now = new Date("2026-10-19T14:11:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const later = (ms: number) => new Date(now.getTime() + ms);

function anAssignment(
	overrides: Partial<Parameters<typeof newAssignment>[0]> = {},
) {
	return newAssignment({
		id: "game-1",
		ownerId: "user-1",
		quizId: "quiz-1",
		quizVersion: 2,
		title: "Capitais",
		pin: "04352236",
		deadline: later(3 * DAY_MS),
		options: DEFAULT_ASSIGNMENT_OPTIONS,
		questionCount: 5,
		now,
		...overrides,
	});
}

describe("assignment deadline (spec 029, RN-08)", () => {
	it("accepts a deadline later than now and up to the maximum days", () => {
		expect(() =>
			assertAssignmentDeadline(later(60_000), now, 28),
		).not.toThrow();
		expect(() =>
			assertAssignmentDeadline(later(28 * DAY_MS), now, 28),
		).not.toThrow();
	});

	it("rejects a deadline at or before now", () => {
		expect(() => assertAssignmentDeadline(now, now, 28)).toThrow(
			AssignmentDeadlinePassedError,
		);
		expect(() => assertAssignmentDeadline(later(-1), now, 28)).toThrow(
			AssignmentDeadlinePassedError,
		);
	});

	it("rejects a deadline past the maximum days", () => {
		expect(() =>
			assertAssignmentDeadline(later(28 * DAY_MS + 1), now, 28),
		).toThrow(AssignmentDeadlineTooFarError);
	});

	it("follows a configured maximum", () => {
		expect(ASSIGNMENT_DEFAULT_MAX_DEADLINE_DAYS).toBe(28);
		expect(() => assertAssignmentDeadline(later(8 * DAY_MS), now, 7)).toThrow(
			AssignmentDeadlineTooFarError,
		);
		expect(() =>
			assertAssignmentDeadline(later(60 * DAY_MS), now, 90),
		).not.toThrow();
	});
});

describe("new assignment (spec 029)", () => {
	it("a new assignment is playing, without stage, started now, with every question counted", () => {
		const assignment = anAssignment();

		expect(assignment).toMatchObject({
			mode: "assignment",
			status: "playing",
			progress: null,
			createdAt: now,
			startedAt: now,
			expiresAt: later(3 * DAY_MS),
			endedAt: null,
			endReason: null,
			questionCount: 5,
			title: "Capitais",
			quizVersion: 2,
			pin: "04352236",
			locked: false,
			autoplaySince: null,
		});
		expect(isGameOpen(assignment)).toBe(true);
	});

	it("shows questions on devices and never randomizes the questions", () => {
		const assignment = anAssignment();

		expect(assignment.options).toMatchObject({
			showQuestionsOnDevices: true,
			randomizeQuestions: false,
			autoplay: false,
		});
	});

	it("keeps the chosen characters, question timer and answer order", () => {
		const assignment = anAssignment({
			options: {
				gameCharacters: true,
				questionTimer: false,
				randomizeAnswers: true,
			},
		});

		expect(assignment.options.gameCharacters).toBe(true);
		expect(assignment.options.randomizeAnswers).toBe(true);
		expect(assignment.questionTimer).toBe(false);
	});

	it("defaults: characters off, timer on, answers in order", () => {
		expect(DEFAULT_ASSIGNMENT_OPTIONS).toEqual({
			gameCharacters: false,
			questionTimer: true,
			randomizeAnswers: false,
		});
	});
});

describe("changing the deadline (spec 029, RN-36 to RN-38)", () => {
	it("changes the deadline of an open assignment, earlier or later", () => {
		const assignment = anAssignment();

		expect(
			changeAssignmentDeadline(assignment, later(10 * DAY_MS), now, 28)
				.expiresAt,
		).toEqual(later(10 * DAY_MS));
		expect(
			changeAssignmentDeadline(assignment, later(DAY_MS), now, 28).expiresAt,
		).toEqual(later(DAY_MS));
	});

	it("checks the new deadline against now", () => {
		const assignment = anAssignment();

		expect(() =>
			changeAssignmentDeadline(assignment, later(30 * DAY_MS), now, 28),
		).toThrow(AssignmentDeadlineTooFarError);
	});

	it("does not change the deadline of an ended assignment", () => {
		const ended = endGame(anAssignment(), "host", later(1000));

		expect(() =>
			changeAssignmentDeadline(ended, later(DAY_MS), later(2000), 28),
		).toThrow(GameEndedError);
	});

	it("a live game has no deadline to change", () => {
		expect(() =>
			changeAssignmentDeadline(aGame(), later(DAY_MS), now, 28),
		).toThrow();
	});
});
