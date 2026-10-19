import { describe, expect, it } from "vitest";

import { DEFAULT_ASSIGNMENT_OPTIONS } from "../domain/assignment";
import { ParticipantNotAtStageError } from "../domain/participant-progress";
import { AvatarFixedError } from "../domain/player";
import { createGameDeps } from "../testing/game-deps";
import { createAdvanceAssignmentPlay } from "./advance-assignment-play";
import { createAnswerAssignmentQuestion } from "./answer-assignment-question";
import { createChangeAssignmentAvatar } from "./change-assignment-avatar";
import { createCreateAssignment } from "./create-assignment";
import { createJoinAssignment } from "./join-assignment";
import { createStartAssignmentPlay } from "./start-assignment-play";

const DAY_MS = 24 * 60 * 60 * 1000;

async function playing(options = {}) {
	const deps = createGameDeps();
	const { gameId } = await createCreateAssignment(deps)({
		ownerId: "user-1",
		quizId: "quiz-1",
		deadline: new Date(deps.clock.now().getTime() + 3 * DAY_MS),
		options: { ...DEFAULT_ASSIGNMENT_OPTIONS, ...options },
	});
	const john = await createJoinAssignment(deps)({ gameId, nickname: "John" });
	const participant = { gameId, playerId: john.playerId, secret: john.secret };
	const advance = (questionIndex: number, phase: "results" | "scoreboard") =>
		createAdvanceAssignmentPlay(deps)({
			...participant,
			from: { questionIndex, phase },
		});
	const answer = (questionIndex: number, choiceIds: string[]) =>
		createAnswerAssignmentQuestion(deps)({
			...participant,
			questionIndex,
			choiceIds,
		});
	return { deps, john, participant, advance, answer };
}

describe("advanceAssignmentPlay (spec 030, RN-12, RN-16)", () => {
	it("results → scoreboard → next question, which starts its time now", async () => {
		const { deps, advance, answer } = await playing();
		await answer(0, ["choice-1"]);

		expect((await advance(0, "results")).screen.phase).toBe("scoreboard");
		deps.clock.advanceBy(30_000);
		const next = await advance(0, "scoreboard");

		expect(next.screen).toMatchObject({
			phase: "answering",
			question: { index: 1 },
			remainingMs: 10_000,
		});
	});

	it("after the last scoreboard the participant finishes with the place", async () => {
		const { advance, answer } = await playing();
		await answer(0, ["choice-1"]);
		await advance(0, "results");
		await advance(0, "scoreboard");
		await answer(1, ["true"]);
		await advance(1, "results");

		const view = await advance(1, "scoreboard");

		expect(view.screen).toMatchObject({ phase: "finished", place: 1 });
		expect(view.history).toHaveLength(2);
	});

	it("a repeated request returns the current screen", async () => {
		const { advance, answer } = await playing();
		await answer(0, ["choice-1"]);
		await advance(0, "results");

		expect((await advance(0, "results")).screen.phase).toBe("scoreboard");
	});

	it("advancing from another screen is refused", async () => {
		const { advance } = await playing();

		await expect(advance(0, "scoreboard")).rejects.toThrow(
			ParticipantNotAtStageError,
		);
	});
});

describe("startAssignmentPlay and changeAssignmentAvatar (spec 030, RN-06)", () => {
	it("start leaves ready for the first question", async () => {
		const { deps, participant } = await playing({ gameCharacters: true });

		const view = await createStartAssignmentPlay(deps)(participant);

		expect(view.screen).toMatchObject({
			phase: "answering",
			question: { index: 0 },
			remainingMs: 20_000,
		});
	});

	it("changes the avatar while ready", async () => {
		const { deps, john, participant } = await playing({ gameCharacters: true });

		const changed = await createChangeAssignmentAvatar(deps)({
			...participant,
			avatar: { character: "fox", accessory: "crown" },
		});

		expect(changed).toEqual({
			avatar: { character: "fox", accessory: "crown" },
		});
		expect((await deps.players.findById(john.playerId))?.avatar).toEqual({
			character: "fox",
			accessory: "crown",
		});
	});

	it("refuses once playing", async () => {
		const { deps, participant } = await playing({ gameCharacters: true });
		await createStartAssignmentPlay(deps)(participant);

		await expect(
			createChangeAssignmentAvatar(deps)({
				...participant,
				avatar: { character: "fox", accessory: null },
			}),
		).rejects.toThrow(AvatarFixedError);
	});
});
