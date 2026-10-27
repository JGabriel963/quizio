import { assertCanLeave } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";

export type LeaveGroup = (input: {
	userId: string;
	groupId: string;
}) => Promise<void>;

/** "Sair do grupo", for members only (spec 034, RN-36). */
export function createLeaveGroup(deps: GroupStoreDeps): LeaveGroup {
	return async (input) => {
		const { membership } = await requireMembership(deps, input);
		assertCanLeave(membership);
		await deps.groupMembers.remove(input.groupId, input.userId);
	};
}
