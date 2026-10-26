import type { Group } from "../domain/group";
import { GroupNotFoundError } from "../domain/group-errors";
import type { GroupMember } from "../domain/group-member";
import type { GroupMemberRepository } from "./ports/group-member-repository";
import type { GroupRepository } from "./ports/group-repository";

export interface GroupStoreDeps {
	groups: GroupRepository;
	groupMembers: GroupMemberRepository;
}

/**
 * The group and the caller's membership. A group the caller is not in is as
 * missing as one that does not exist (spec 034, RN-05).
 */
export async function requireMembership(
	deps: GroupStoreDeps,
	input: { groupId: string; userId: string },
): Promise<{ group: Group; membership: GroupMember }> {
	const membership = await deps.groupMembers.find(input.groupId, input.userId);
	const group = membership && (await deps.groups.findById(input.groupId));
	if (!membership || !group) {
		throw new GroupNotFoundError();
	}
	return { group, membership };
}
