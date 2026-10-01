import type { Question } from "../../quiz/domain/question";
import { createAdvanceGame } from "../application/advance-game";
import { createStartGame } from "../application/start-game";
import { createSubmitAnswer } from "../application/submit-answer";
import {
	type GamePhase,
	isAtStage,
	isPlaying,
	phaseDurationMs,
	type StageRef,
} from "../domain/game-progress";
import { aGame, aPlayer } from "./a-game";
import { createGameDeps } from "./game-deps";

/**
 * Test setup: game-1 of user-1, started with players p1, p2… (secrets s1,
 * s2…), sitting in the game intro. `reach` plays it forward as the host's
 * screen would.
 */
export async function createStartedGame(
	options: { players?: string[]; questions?: Question[] } = {},
) {
	const deps = createGameDeps({ questions: options.questions });
	await deps.games.save(aGame({ createdAt: deps.clock.now() }));
	const nicknames = options.players ?? ["Ana", "Bia"];
	for (const [index, nickname] of nicknames.entries()) {
		await deps.players.add(
			aPlayer({ id: `p${index + 1}`, nickname, secret: `s${index + 1}` }),
		);
	}

	const host = { ownerId: "user-1", gameId: "game-1" };
	const advance = createAdvanceGame(deps);
	const submitAnswer = createSubmitAnswer(deps);
	await createStartGame(deps)(host);

	async function stored() {
		const game = await deps.games.findById("game-1");
		if (!game) {
			throw new Error("game-1 is gone");
		}
		return game;
	}

	/** Where the stored game is; fails if it is not being played. */
	async function stage(): Promise<StageRef> {
		const game = await stored();
		if (!isPlaying(game)) {
			throw new Error(`game-1 is ${game.status}, not playing`);
		}
		const { questionIndex, phase } = game.progress;
		return { questionIndex, phase };
	}

	/**
	 * Advances until the game is at that stage: intros run their time, answers
	 * are skipped and results are advanced at once.
	 */
	async function reach(phase: GamePhase, questionIndex = 0) {
		const target = { questionIndex, phase };
		for (let steps = 0; steps < 50; steps++) {
			const game = await stored();
			if (isAtStage(game, target)) {
				return;
			}
			const from = await stage();
			if (from.phase !== "answering") {
				deps.clock.advanceBy(phaseDurationMs(from.phase, 0) ?? 0);
			}
			await advance({ ...host, from, skip: from.phase === "answering" });
		}
		throw new Error(
			`game-1 never reached ${phase} of question ${questionIndex}`,
		);
	}

	/** Player `number` (1-based) answers the question being asked. */
	async function answer(number: number, ...choiceIds: string[]) {
		const { questionIndex } = await stage();
		await submitAnswer({
			gameId: "game-1",
			playerId: `p${number}`,
			secret: `s${number}`,
			questionIndex,
			choiceIds,
		});
	}

	return { deps, host, advance, submitAnswer, stored, stage, reach, answer };
}
