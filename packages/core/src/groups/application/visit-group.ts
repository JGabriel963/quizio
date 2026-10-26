import type { Clock } from "../../shared/application/ports/clock";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupVisitRepository } from "./ports/group-visit-repository";

export type VisitGroup = (input: {
	userId: string;
	groupId: string;
}) => Promise<void>;

/**
 * Opening a group puts it on top of "Grupos recentes" (spec 034, RN-20). A
 * write of its own, so the group's query never writes.
 */
export function createVisitGroup(
	deps: GroupStoreDeps & { groupVisits: GroupVisitRepository; clock: Clock },
): VisitGroup {
	return async (input) => {
		await requireMembership(deps, input);
		await deps.groupVisits.touch(input.userId, input.groupId, deps.clock.now());
	};
}
