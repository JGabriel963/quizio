import type { Clock } from "../../shared/application/ports/clock";
import { GroupMemberNotFoundError } from "../domain/group-errors";
import { assertAdmin, assertRemovable } from "../domain/group-permissions";
import { type InboxSignalDeps, noticeRemoved } from "./inbox-signals";
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
	deps: GroupStoreDeps & Pick<InboxSignalDeps, "groupInbox"> & { clock: Clock },
): RemoveGroupMember {
	return async ({ memberId, ...input }) => {
		const { group, membership } = await requireMembership(deps, input);
		assertAdmin(membership);
		const target = await deps.groupMembers.find(input.groupId, memberId);
		if (!target) {
			throw new GroupMemberNotFoundError();
		}
		assertRemovable(target);
		await deps.groupMembers.remove(input.groupId, memberId);
		// Their notifications of the group go with the membership (RN-06, RN-18).
		await noticeRemoved(deps, memberId, group.name, deps.clock.now());
	};
}
