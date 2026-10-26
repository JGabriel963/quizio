import { type GroupRole, sortMembers } from "../domain/group-member";
import { GROUP_MEMBER_PREVIEW } from "../domain/group-section";
import { type GroupSetup, groupSetupOf } from "../domain/group-setup";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupReads } from "./ports/group-reads";

/** The group's page (spec 034, RN-13 to RN-19). */
export interface GroupView {
	id: string;
	name: string;
	/** The viewer's role. */
	role: GroupRole;
	adminName: string;
	memberCount: number;
	createdAt: Date;
	/** Up to 3, the admin first (RN-13). */
	memberPreview: { userId: string; name: string }[];
	/** Null for a member, or once dismissed (RN-17). */
	setup: GroupSetup | null;
}

export type GetGroup = (input: {
	userId: string;
	groupId: string;
}) => Promise<GroupView>;

export function createGetGroup(
	deps: GroupStoreDeps & { groupReads: GroupReads },
): GetGroup {
	return async (input) => {
		const { group, membership } = await requireMembership(deps, input);
		const members = sortMembers(await deps.groupReads.members(group.id));
		const admin = members.find((member) => member.role === "admin");
		return {
			id: group.id,
			name: group.name,
			role: membership.role,
			adminName: admin?.name ?? "",
			memberCount: members.length,
			createdAt: group.createdAt,
			memberPreview: members
				.slice(0, GROUP_MEMBER_PREVIEW)
				.map(({ userId, name }) => ({ userId, name })),
			setup: groupSetupOf(group, members.length, membership.role),
		};
	};
}
