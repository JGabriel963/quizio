import { parseGroupDescription, parseGroupName } from "../domain/group";
import { assertAdmin } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";

export type UpdateGroupDetails = (input: {
	userId: string;
	groupId: string;
	name: string;
	description: string;
}) => Promise<{ name: string; description: string }>;

/**
 * "Nome e descrição": both checked before either is written, and written
 * together, without the switches (spec 035, RN-04, RN-09).
 */
export function createUpdateGroupDetails(
	deps: GroupStoreDeps,
): UpdateGroupDetails {
	return async ({ name: rawName, description: rawDescription, ...input }) => {
		const { membership } = await requireMembership(deps, input);
		assertAdmin(membership);
		const details = {
			name: parseGroupName(rawName),
			description: parseGroupDescription(rawDescription),
		};
		await deps.groups.saveDetails(input.groupId, details);
		return details;
	};
}
