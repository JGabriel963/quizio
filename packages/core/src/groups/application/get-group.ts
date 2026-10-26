import { type GroupRole, sortMembers } from "../domain/group-member";
import {
	canAssign,
	canInvite,
	canSeeMembers,
} from "../domain/group-permissions";
import { GROUP_MEMBER_PREVIEW } from "../domain/group-section";
import { type GroupSetup, groupSetupOf } from "../domain/group-setup";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupFeedQuery } from "./ports/group-feed-query";
import type { GroupReads } from "./ports/group-reads";

/** The group's page (spec 034, RN-13 to RN-19). */
export interface GroupView {
	id: string;
	name: string;
	/** "" when there is none (spec 035, RN-06). */
	description: string;
	/** The viewer's role. */
	role: GroupRole;
	adminName: string;
	memberCount: number;
	createdAt: Date;
	/** What the viewer may do, as the switches say (spec 035, RN-11, RN-13). */
	abilities: { invite: boolean; seeMembers: boolean; assign: boolean };
	/** Up to 3, the admin first (RN-13); none when the list is hidden (spec 035). */
	memberPreview: { userId: string; name: string }[];
	/** Null for a member, or once dismissed (RN-17). */
	setup: GroupSetup | null;
}

export type GetGroup = (input: {
	userId: string;
	groupId: string;
}) => Promise<GroupView>;

export function createGetGroup(
	deps: GroupStoreDeps & { groupReads: GroupReads; groupFeed: GroupFeedQuery },
): GetGroup {
	return async (input) => {
		const { group, membership } = await requireMembership(deps, input);
		const members = sortMembers(await deps.groupReads.members(group.id));
		const admin = members.find((member) => member.role === "admin");
		const seeMembers = canSeeMembers(group, membership.role);
		return {
			id: group.id,
			name: group.name,
			description: group.description,
			role: membership.role,
			adminName: admin?.name ?? "",
			memberCount: members.length,
			createdAt: group.createdAt,
			abilities: {
				invite: canInvite(group, membership.role),
				seeMembers,
				// Spec 038, RN-01.
				assign: canAssign(group, membership.role),
			},
			// No names the screen may not show leave the server (spec 035, RN-13).
			memberPreview: seeMembers
				? members
						.slice(0, GROUP_MEMBER_PREVIEW)
						.map(({ userId, name }) => ({ userId, name }))
				: [],
			setup: groupSetupOf(
				group,
				members.length,
				membership.role,
				await deps.groupFeed.feedStats(group.id),
			),
		};
	};
}
