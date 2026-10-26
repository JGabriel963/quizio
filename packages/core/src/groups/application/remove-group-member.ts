import { GroupMemberNotFoundError } from "../domain/group-errors";
import { assertAdmin, assertRemovable } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";

export type RemoveGroupMember = (input: {
	userId: string;
	groupId: string;
	memberId: string;
}) => Promise<void>;

/**
 * The admin takes a member out. It is not a ban: the link still lets them
 * back until it is reset (spec 034, RN-30, RN-35).
 */
export function createRemoveGroupMember(
	deps: GroupStoreDeps,
): RemoveGroupMember {
	return async ({ memberId, ...input }) => {
		const { membership } = await requireMembership(deps, input);
		assertAdmin(membership);
		const target = await deps.groupMembers.find(input.groupId, memberId);
		if (!target) {
			throw new GroupMemberNotFoundError();
		}
		assertRemovable(target);
		await deps.groupMembers.remove(input.groupId, memberId);
	};
}
