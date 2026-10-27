import { assertCanInvite } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";

export type GetGroupInvite = (input: {
	userId: string;
	groupId: string;
}) => Promise<{ code: string }>;

/**
 * The link's code, for the admin and, when the admin lets them, the members
 * (spec 034, RN-22; spec 035, RN-11, RN-12). The web builds the link.
 */
export function createGetGroupInvite(deps: GroupStoreDeps): GetGroupInvite {
	return async (input) => {
		const { group, membership } = await requireMembership(deps, input);
		assertCanInvite(group, membership);
		return { code: group.inviteCode };
	};
}
