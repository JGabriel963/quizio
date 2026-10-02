import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { RealtimePublisher } from "../../shared/application/ports/realtime-publisher";
import {
	endGame,
	expireIfDue,
	type Game,
	type GameEndReason,
} from "../domain/game";
import {
	GAME_EVENTS,
	type GameEndedPayload,
	gameChannel,
	type StageChangedPayload,
} from "../domain/game-events";
import { isPlaying } from "../domain/game-progress";
import type { GameQuestion } from "../domain/game-question";
import { publicStageOf } from "../domain/public-stage";
import type { GameRepository } from "./ports/game-repository";

/**
 * Every use case reads a game through here: one past its deadline comes back
 * ended, and the ending is stored on the way (spec 008, RN-11; ADR 0009).
 */
export async function loadGame(
	deps: { games: Pick<GameRepository, "findById" | "save">; clock: Clock },
	gameId: string,
): Promise<Game | null> {
	const stored = await deps.games.findById(gameId);
	return stored ? settleGame(deps, stored) : null;
}

/** Applies the deadline to a game that was read some other way. */
export async function settleGame(
	deps: { games: Pick<GameRepository, "save">; clock: Clock },
	stored: Game,
): Promise<Game> {
	const game = expireIfDue(stored, deps.clock.now());
	if (game !== stored) {
		await deps.games.save(game);
	}
	return game;
}

/**
 * Events are hints (ADR 0009): the write already happened, so a publisher that
 * fails only delays the screens until their next query.
 */
export async function publishToGame<TPayload>(
	realtime: RealtimePublisher,
	gameId: string,
	event: string,
	payload: TPayload,
): Promise<void> {
	try {
		await realtime.publish({ channel: gameChannel(gameId), event, payload });
	} catch {
		// Deliberately ignored.
	}
}

/**
 * Tells the screens where the game went (spec 009): the public part of the
 * stage, or none once the game is finished. `question` is the one of the
 * game's stage. The storage gives the image its address when the questions
 * go to the devices (spec 012).
 */
export async function publishStage(
	deps: {
		realtime: RealtimePublisher;
		storage: Pick<ObjectStorage, "getPublicUrl">;
	},
	game: Game,
	question: GameQuestion | null,
): Promise<void> {
	await publishToGame<StageChangedPayload>(
		deps.realtime,
		game.id,
		GAME_EVENTS.stageChanged,
		{
			status: game.status,
			stage: isPlaying(game)
				? publicStageOf(game, question, (key) => deps.storage.getPublicUrl(key))
				: null,
		},
	);
}

/** Ends an open game and tells its screens; a game already ended is left alone. */
export async function closeGame(
	deps: {
		games: Pick<GameRepository, "save">;
		clock: Clock;
		realtime: RealtimePublisher;
	},
	game: Game,
	reason: GameEndReason,
): Promise<Game> {
	const ended = endGame(game, reason, deps.clock.now());
	if (ended === game) {
		return game;
	}
	await deps.games.save(ended);
	await publishToGame<GameEndedPayload>(
		deps.realtime,
		ended.id,
		GAME_EVENTS.gameEnded,
		{ reason },
	);
	return ended;
}
