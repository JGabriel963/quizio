import { assertAdmin, type GroupPermission } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";

export type SetGroupPermission = (input: {
	userId: string;
	groupId: string;
	permission: GroupPermission;
	value: boolean;
}) => Promise<void>;

/**
 * Turns one switch, and only it, so two turned at once both stay (spec 035,
 * RN-09). Writing the value it already has changes nothing.
 */
export function createSetGroupPermission(
	deps: GroupStoreDeps,
): SetGroupPermission {
	return async ({ permission, value, ...input }) => {
		const { membership } = await requireMembership(deps, input);
		assertAdmin(membership);
		await deps.groups.savePermission(input.groupId, permission, value);
	};
}
