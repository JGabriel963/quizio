import { assertAdmin } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";

export type GetGroupInvite = (input: {
	userId: string;
	groupId: string;
}) => Promise<{ code: string }>;

/** The link's code is the admin's (spec 034, RN-22); the web builds the link. */
export function createGetGroupInvite(deps: GroupStoreDeps): GetGroupInvite {
	return async (input) => {
		const { group, membership } = await requireMembership(deps, input);
		assertAdmin(membership);
		return { code: group.inviteCode };
	};
}
