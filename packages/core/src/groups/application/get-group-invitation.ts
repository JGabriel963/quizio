import type { GroupStoreDeps } from "./load-group";

/** What the invite link's screen shows (spec 034, RN-25, RN-27, RN-28). */
export type GroupInvitation =
	| { status: "invalid" }
	| { status: "pending"; groupId: string; name: string }
	| { status: "member"; groupId: string };

export type GetGroupInvitation = (input: {
	userId: string;
	code: string;
}) => Promise<GroupInvitation>;

/**
 * Never throws: an invalid link is one of the screen's states. Before
 * accepting, only the group's name is told.
 */
export function createGetGroupInvitation(
	deps: GroupStoreDeps,
): GetGroupInvitation {
	return async ({ userId, code }) => {
		const group = await deps.groups.findByInviteCode(code);
		if (!group) {
			return { status: "invalid" };
		}
		if (await deps.groupMembers.find(group.id, userId)) {
			return { status: "member", groupId: group.id };
		}
		return { status: "pending", groupId: group.id, name: group.name };
	};
}
