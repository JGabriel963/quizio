import {
	SharedQuizNotFoundError,
	UnshareNotAllowedError,
} from "../domain/group-errors";
import { canUnshare } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupSharedQuizRepository } from "./ports/group-shared-quiz-repository";

export type UnshareQuiz = (input: {
	userId: string;
	groupId: string;
	quizId: string;
}) => Promise<void>;

/**
 * "Remover do grupo" (spec 037, RN-13): the share goes, and its post loses
 * the card when it is read again.
 */
export function createUnshareQuiz(
	deps: GroupStoreDeps & { groupSharedQuizzes: GroupSharedQuizRepository },
): UnshareQuiz {
	return async ({ quizId, ...input }) => {
		const { membership } = await requireMembership(deps, input);
		const shared = await deps.groupSharedQuizzes.findSharedQuiz(
			input.groupId,
			quizId,
		);
		if (!shared) {
			throw new SharedQuizNotFoundError();
		}
		if (!canUnshare(shared, membership)) {
			throw new UnshareNotAllowedError();
		}
		await deps.groupSharedQuizzes.removeSharedQuiz(shared.id);
	};
}
