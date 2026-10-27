import type { GroupPost } from "../../domain/group-post";
import type { SharedQuiz } from "../../domain/shared-quiz";

/**
 * The writes of "Compartilhado" (spec 037; ADR 0018). The database removes a
 * share with its quiz, with the sharer's membership and with the group.
 */
export interface GroupSharedQuizRepository {
	/**
	 * The shares and their post in one transaction (RN-06, RN-08):
	 * "alreadyShared" writes nothing when one of the quizzes is in the group.
	 */
	shareWithPost(
		shares: readonly SharedQuiz[],
		post: GroupPost,
	): Promise<"created" | "alreadyShared">;
	findSharedQuiz(groupId: string, quizId: string): Promise<SharedQuiz | null>;
	removeSharedQuiz(id: string): Promise<void>;
	/** Every quiz of the group, alive or in the trash ("Já compartilhado"). */
	sharedQuizIdsOf(groupId: string): Promise<string[]>;
}
