import type { AttemptLimiter } from "../../shared/application/ports/attempt-limiter";
import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { Shuffler } from "../../shared/application/ports/shuffler";
import { type AvatarInput, drawAvatar, knownAvatar } from "../domain/avatar";
import {
	assertGameOpen,
	GAME_MAX_PLAYERS,
	GameFullError,
	GameNotFoundError,
	NicknameTakenError,
	requireAssignment,
} from "../domain/game";
import type { GameQuestion } from "../domain/game-question";
import { parseNickname } from "../domain/nickname";
import { newAssignmentParticipant } from "../domain/player";
import { loadGame } from "./game-lifecycle";
import { reserveJoin } from "./join-limit";
import type { GameQuestionRepository } from "./ports/game-question-repository";
import type { GameRepository } from "./ports/game-repository";
import type { PlayerRepository } from "./ports/player-repository";

export type JoinAssignment = (input: {
	gameId: string;
	nickname: string;
	/** The one this browser chose last (spec 028, RN-08); drawn without it. */
	avatar?: AvatarInput | null;
	/** Who is joining, for the limit per network (RN-04a): the client's network address. */
	clientKey: string;
}) => Promise<{ playerId: string; secret: string; nickname: string }>;

/**
 * "Ok, vamos lá!" of an assignment (spec 030, RN-02 to RN-07): a nickname of
 * its own in the activity, within 200 participants, while it is open; the
 * participant starts at the first question, or ready to pick a character.
 */
export function createJoinAssignment(deps: {
	games: GameRepository;
	players: Pick<PlayerRepository, "add">;
	gameQuestions: Pick<GameQuestionRepository, "find">;
	ids: IdGenerator;
	clock: Clock;
	shuffler: Shuffler;
	attempts: AttemptLimiter;
}): JoinAssignment {
	return async ({
		gameId,
		nickname: rawNickname,
		avatar: remembered,
		clientKey,
	}) => {
		const stored = await loadGame(deps, gameId);
		if (!stored) {
			throw new GameNotFoundError("Assignment not found");
		}
		const game = requireAssignment(stored);
		assertGameOpen(game);
		const nickname = parseNickname(rawNickname);
		const now = deps.clock.now();

		const questions: GameQuestion[] = [];
		for (let index = 0; index < game.questionCount; index++) {
			const question = await deps.gameQuestions.find(game.id, index);
			if (question) {
				questions.push(question);
			}
		}
		const player = newAssignmentParticipant({
			id: deps.ids.generate(),
			game,
			questions,
			nickname,
			secret: deps.ids.generate(),
			// One that left the catalog is no error: a new one is drawn (spec 028).
			avatar: knownAvatar(remembered ?? null) ?? drawAvatar(deps.shuffler),
			shuffle: (items) => deps.shuffler.shuffle(items),
			now,
		});
		const releaseJoin = await reserveJoin(
			deps.attempts,
			game.id,
			clientKey,
			now,
		);
		// The place and the nickname are taken with the insert itself (spec 008).
		const added = await deps.players.add(player, GAME_MAX_PLAYERS);
		if (added !== "added") {
			await releaseJoin();
		}
		if (added === "full") {
			throw new GameFullError("The activity is full");
		}
		if (added === "nicknameTaken") {
			throw new NicknameTakenError("This nickname is taken in the activity");
		}
		return { playerId: player.id, secret: player.secret, nickname };
	};
}
