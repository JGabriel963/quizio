import type { AssignmentOptions } from "../../../game/domain/assignment";
import type { GroupAssignmentRecord } from "../../domain/group-assignment";

/**
 * Assignments as the groups reach them (spec 038; ADR 0016). Creating one is
 * the game context's "Criar uma tarefa" (spec 029), wired in the container;
 * reading is a read model over the game, the report, the quiz and the
 * creator's account, where a deleted game is simply missing.
 */
export interface GroupAssignments {
	/** Refuses as `createAssignment` does: deadline, playable quiz, owner. */
	create(input: {
		ownerId: string;
		quizId: string;
		deadline: Date;
		options: AssignmentOptions;
	}): Promise<{ gameId: string }>;
}

export interface GroupAssignmentQuery {
	/** Only assignments; live games and deleted ones are missing. */
	findAssignments(gameIds: readonly string[]): Promise<GroupAssignmentRecord[]>;
}
