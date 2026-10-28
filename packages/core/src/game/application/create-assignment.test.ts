import { describe, expect, it } from "vitest";

import { A_THEME_LOOK } from "../../shared/testing/a-theme-look";

import {
	AssignmentDeadlinePassedError,
	AssignmentDeadlineTooFarError,
	DEFAULT_ASSIGNMENT_OPTIONS,
} from "../domain/assignment";
import { GameQuizNotFoundError, QuizNotPlayableError } from "../domain/game";
import { aGame } from "../testing/a-game";
import { createGameDeps } from "../testing/game-deps";
import { aPlayableQuiz } from "../testing/in-memory-playable-quiz-query";
import { createCreateAssignment } from "./create-assignment";
import { createHostGame } from "./host-game";

const DAY_MS = 24 * 60 * 60 * 1000;
// The deps' clock reads 2026-06-01T12:00:00.000Z.
const inDays = (days: number) =>
	new Date(new Date("2026-06-01T12:00:00.000Z").getTime() + days * DAY_MS);

const assign = (overrides = {}) => ({
	ownerId: "user-1",
	quizId: "quiz-1",
	deadline: inDays(3),
	options: DEFAULT_ASSIGNMENT_OPTIONS,
	...overrides,
});

describe("createAssignment theme (spec 042)", () => {
	it("the assignment takes the quiz's theme (RN-10)", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz({ themeId: "light-orange" })],
		});

		const { gameId } = await createCreateAssignment(deps)(assign());

		expect((await deps.games.findById(gameId))?.themeId).toBe("light-orange");
	});

	it("changing the quiz's theme does not change an open assignment (RN-11)", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz({ themeId: "blue" })],
		});
		const { gameId } = await createCreateAssignment(deps)(assign());

		deps.quizzes[0] = aPlayableQuiz({ themeId: "light" });

		expect((await deps.games.findById(gameId))?.themeId).toBe("blue");
	});

	it("copies the quiz's custom look, a shared quiz its owner's (spec 043, RN-24, RN-25)", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz({ customTheme: A_THEME_LOOK })],
		});

		const { gameId } = await createCreateAssignment(deps)(assign());

		expect((await deps.games.findById(gameId))?.customTheme).toEqual(
			A_THEME_LOOK,
		);
	});
});

describe("createAssignment (spec 029)", () => {
	it("creates an open assignment with an eight-digit PIN and the quiz's current title", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz({ title: "Capitais", version: 3 })],
		});
		deps.versionQuestions.set(3, deps.versionQuestions.get(1) ?? []);

		const { gameId, pin } = await createCreateAssignment(deps)(assign());

		expect(pin).toBe("04352236");
		expect(await deps.games.findById(gameId)).toMatchObject({
			mode: "assignment",
			status: "playing",
			ownerId: "user-1",
			quizId: "quiz-1",
			quizVersion: 3,
			title: "Capitais",
			pin: "04352236",
			expiresAt: inDays(3),
			endedAt: null,
			questionCount: 2,
		});
	});

	it("copies the playable version's questions in order, unshuffled", async () => {
		const deps = createGameDeps();

		const { gameId } = await createCreateAssignment(deps)(
			assign({
				options: { ...DEFAULT_ASSIGNMENT_OPTIONS, randomizeAnswers: true },
			}),
		);

		const first = await deps.gameQuestions.find(gameId, 0);
		const second = await deps.gameQuestions.find(gameId, 1);
		expect(first?.type).toBe("quiz");
		expect(second?.type).toBe("trueFalse");
		expect(
			first?.type === "quiz" && first.choices.map(({ text }) => text),
		).toEqual(["Brasília", "Rio de Janeiro", "Salvador", "Recife"]);
	});

	it("keeps the chosen options and saves them as the creator's preferences", async () => {
		const deps = createGameDeps();
		const options = {
			gameCharacters: true,
			questionTimer: false,
			randomizeAnswers: true,
		};

		const { gameId } = await createCreateAssignment(deps)(assign({ options }));

		const game = await deps.games.findById(gameId);
		expect(game?.questionTimer).toBe(false);
		expect(game?.options).toMatchObject({
			gameCharacters: true,
			randomizeAnswers: true,
			showQuestionsOnDevices: true,
		});
		expect(await deps.assignmentPreferences.find("user-1")).toEqual(options);
		expect(await deps.preferences.find("user-1")).toBeNull();
	});

	it("leaves the live game of the quiz open", async () => {
		const deps = createGameDeps();
		const { gameId: liveId } = await createHostGame(deps)({
			ownerId: "user-1",
			quizId: "quiz-1",
		});

		await createCreateAssignment(deps)(assign());

		expect((await deps.games.findById(liveId))?.endedAt).toBeNull();
	});

	it("a second assignment of the same quiz stays open beside the first", async () => {
		const deps = createGameDeps({ assignmentPins: ["00000001", "00000002"] });
		const create = createCreateAssignment(deps);

		const first = await create(assign());
		const second = await create(assign({ deadline: inDays(5) }));

		expect((await deps.games.findById(first.gameId))?.endedAt).toBeNull();
		expect((await deps.games.findById(second.gameId))?.endedAt).toBeNull();
		expect(second.pin).not.toBe(first.pin);
	});

	it("draws again when the PIN is taken", async () => {
		const deps = createGameDeps({ assignmentPins: ["00000001", "00000002"] });
		await deps.games.save(
			aGame({
				id: "other",
				mode: "assignment",
				status: "playing",
				pin: "00000001",
				quizId: "quiz-2",
				expiresAt: inDays(10),
			}),
		);

		const { pin } = await createCreateAssignment(deps)(assign());

		expect(pin).toBe("00000002");
	});

	it("refuses a draft", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz({ version: null })],
		});

		await expect(createCreateAssignment(deps)(assign())).rejects.toThrow(
			QuizNotPlayableError,
		);
	});

	it("refuses a quiz in the trash", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz({ trashed: true })],
		});

		await expect(createCreateAssignment(deps)(assign())).rejects.toThrow(
			QuizNotPlayableError,
		);
	});

	it("refuses another creator's quiz as missing", async () => {
		const deps = createGameDeps();

		await expect(
			createCreateAssignment(deps)(assign({ ownerId: "user-2" })),
		).rejects.toThrow(GameQuizNotFoundError);
	});

	it("a member with a grant assigns a shared quiz as their own assignment (spec 037, RN-20)", async () => {
		const deps = createGameDeps();
		deps.quizShareGrants.grant("carla", "quiz-1");

		const { gameId } = await createCreateAssignment(deps)(
			assign({ ownerId: "carla" }),
		);

		expect(await deps.games.findById(gameId)).toMatchObject({
			ownerId: "carla",
			quizId: "quiz-1",
			mode: "assignment",
		});
	});

	it("refuses a shared quiz without a grant (spec 037)", async () => {
		const deps = createGameDeps();

		await expect(
			createCreateAssignment(deps)(assign({ ownerId: "carla" })),
		).rejects.toThrow(GameQuizNotFoundError);
	});

	it("refuses a deadline in the past or past the maximum days, creating nothing", async () => {
		const deps = createGameDeps();
		const create = createCreateAssignment(deps);

		await expect(create(assign({ deadline: inDays(-1) }))).rejects.toThrow(
			AssignmentDeadlinePassedError,
		);
		await expect(create(assign({ deadline: inDays(29) }))).rejects.toThrow(
			AssignmentDeadlineTooFarError,
		);
		expect(deps.games.all()).toEqual([]);
		expect(await deps.assignmentPreferences.find("user-1")).toBeNull();
	});

	it("later edits of the quiz do not reach the assignment", async () => {
		const deps = createGameDeps({
			quizzes: [aPlayableQuiz({ title: "Capitais", version: 1 })],
		});
		const { gameId } = await createCreateAssignment(deps)(assign());

		deps.quizzes[0] = aPlayableQuiz({ title: "Capitais do mundo", version: 2 });
		deps.versionQuestions.set(2, []);

		const game = await deps.games.findById(gameId);
		expect(game).toMatchObject({
			title: "Capitais",
			quizVersion: 1,
			questionCount: 2,
		});
		expect(await deps.gameQuestions.find(gameId, 1)).not.toBeNull();
	});
});
