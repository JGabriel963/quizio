import type { GameQuestion } from "../../domain/game-question";

/** The questions a game copied from the playable version when it started (spec 009). */
export interface GameQuestionRepository {
	/** Written once; a second start of the same game leaves the first copy. */
	saveAll(gameId: string, questions: readonly GameQuestion[]): Promise<void>;
	find(gameId: string, index: number): Promise<GameQuestion | null>;
}
