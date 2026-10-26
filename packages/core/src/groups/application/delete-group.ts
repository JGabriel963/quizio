import { assertAdmin } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";

export type DeleteGroup = (input: {
	userId: string;
	groupId: string;
}) => Promise<void>;

/** For good and for everybody; the link stops working (spec 034, RN-37). */
export function createDeleteGroup(deps: GroupStoreDeps): DeleteGroup {
	return async (input) => {
		const { membership } = await requireMembership(deps, input);
		assertAdmin(membership);
		await deps.groups.delete(input.groupId);
	};
}
