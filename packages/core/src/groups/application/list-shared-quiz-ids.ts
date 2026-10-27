import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupSharedQuizRepository } from "./ports/group-shared-quiz-repository";

export type ListSharedQuizIds = (input: {
	userId: string;
	groupId: string;
}) => Promise<string[]>;

/** "Já compartilhado" in "Selecionar kahoot" (spec 037, RN-04). */
export function createListSharedQuizIds(
	deps: GroupStoreDeps & { groupSharedQuizzes: GroupSharedQuizRepository },
): ListSharedQuizIds {
	return async (input) => {
		await requireMembership(deps, input);
		return deps.groupSharedQuizzes.sharedQuizIdsOf(input.groupId);
	};
}
