import type { GroupPermissions } from "../domain/group-permissions";
import { assertAdmin } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";

/** What "Configurações do grupo" shows (spec 035, RN-03). */
export interface GroupSettings {
	name: string;
	description: string;
	permissions: GroupPermissions;
}

export type GetGroupSettings = (input: {
	userId: string;
	groupId: string;
}) => Promise<GroupSettings>;

/** The admin's only (spec 035, RN-02). */
export function createGetGroupSettings(deps: GroupStoreDeps): GetGroupSettings {
	return async (input) => {
		const { group, membership } = await requireMembership(deps, input);
		assertAdmin(membership);
		return {
			name: group.name,
			description: group.description,
			permissions: { ...group.permissions },
		};
	};
}
