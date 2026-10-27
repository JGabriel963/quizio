import { describe, expect, it } from "vitest";

import { aGameQuestion } from "../testing/a-game-question";
import { DEFAULT_ASSIGNMENT_OPTIONS, newAssignment } from "./assignment";
import {
	answerDeadline,
	finishProgress,
	firstProgress,
	nextProgress,
	type ParticipantProgress,
	settleProgress,
} from "./participant-progress";

const now = new Date("2026-10-19T14:00:00.000Z");
const later = (ms: number) => new Date(now.getTime() + ms);

const assignment = (options = {}) =>
	newAssignment({
		id: "game-1",
		ownerId: "user-1",
		quizId: "quiz-1",
		quizVersion: 1,
		title: "Capitais",
		pin: "04352236",
		deadline: later(3 * 24 * 60 * 60 * 1000),
		options: { ...DEFAULT_ASSIGNMENT_OPTIONS, ...options },
		questionCount: 3,
		themeId: "standard",
		now,
	});

const question = aGameQuestion({ index: 0, timeLimitSeconds: 20 });
const answering: ParticipantProgress = {
	questionIndex: 0,
	phase: "answering",
	startedAt: now,
};

describe("participant progress (spec 030)", () => {
	it("a participant starts answering the first question at once", () => {
		expect(firstProgress(assignment(), now)).toEqual(answering);
	});

	it("with characters on, a participant starts ready", () => {
		expect(firstProgress(assignment({ gameCharacters: true }), now)).toEqual({
			questionIndex: 0,
			phase: "ready",
			startedAt: now,
		});
	});

	it("the deadline is the start plus the time limit", () => {
		expect(answerDeadline(assignment(), question, answering)).toEqual(
			later(20_000),
		);
	});

	it("without the question timer there is no deadline", () => {
		expect(
			answerDeadline(assignment({ questionTimer: false }), question, answering),
		).toBeNull();
	});

	it("settling past the deadline goes to the results at the deadline", () => {
		expect(
			settleProgress(assignment(), question, answering, later(60_000)),
		).toEqual({ questionIndex: 0, phase: "results", startedAt: later(20_000) });
	});

	it("settling before the deadline changes nothing", () => {
		expect(
			settleProgress(assignment(), question, answering, later(19_999)),
		).toBe(answering);
		expect(
			settleProgress(
				assignment({ questionTimer: false }),
				question,
				answering,
				later(600_000),
			),
		).toBe(answering);
	});

	it("next goes ready → answering → results → scoreboard → next question", () => {
		const ready: ParticipantProgress = {
			questionIndex: 0,
			phase: "ready",
			startedAt: now,
		};
		const t = later(1000);

		expect(nextProgress(ready, 3, t)).toEqual({
			questionIndex: 0,
			phase: "answering",
			startedAt: t,
		});
		expect(nextProgress(answering, 3, t)).toEqual({
			questionIndex: 0,
			phase: "results",
			startedAt: t,
		});
		expect(nextProgress({ ...answering, phase: "results" }, 3, t)).toEqual({
			questionIndex: 0,
			phase: "scoreboard",
			startedAt: t,
		});
		expect(nextProgress({ ...answering, phase: "scoreboard" }, 3, t)).toEqual({
			questionIndex: 1,
			phase: "answering",
			startedAt: t,
		});
	});

	it("next after the last scoreboard is finished", () => {
		const t = later(1000);

		expect(
			nextProgress(
				{ questionIndex: 2, phase: "scoreboard", startedAt: now },
				3,
				t,
			),
		).toEqual({ questionIndex: 2, phase: "finished", startedAt: t });
		expect(
			nextProgress(
				{ questionIndex: 2, phase: "finished", startedAt: now },
				3,
				t,
			),
		).toEqual({ questionIndex: 2, phase: "finished", startedAt: now });
	});

	it("finishing keeps where the participant was", () => {
		expect(finishProgress(answering, later(5000))).toEqual({
			questionIndex: 0,
			phase: "finished",
			startedAt: later(5000),
		});
		const finished: ParticipantProgress = { ...answering, phase: "finished" };
		expect(finishProgress(finished, later(5000))).toBe(finished);
	});
});
