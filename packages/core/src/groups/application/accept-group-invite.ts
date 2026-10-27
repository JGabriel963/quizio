import type { Clock } from "../../shared/application/ports/clock";
import { InvalidGroupInviteError } from "../domain/group-errors";
import type { GroupStoreDeps } from "./load-group";

export type AcceptGroupInvite = (input: {
	userId: string;
	code: string;
}) => Promise<{ groupId: string }>;

/**
 * "Aceitar convite". The database adds the member only while the code is
 * still the group's, so a reset at the same moment wins (spec 034, RN-29);
 * who already belongs just goes in (RN-27).
 */
export function createAcceptGroupInvite(
	deps: GroupStoreDeps & { clock: Clock },
): AcceptGroupInvite {
	return async ({ userId, code }) => {
		const group = await deps.groups.findByInviteCode(code);
		if (!group) {
			throw new InvalidGroupInviteError();
		}
		const result = await deps.groupMembers.addWithInvite({
			groupId: group.id,
			inviteCode: code,
			userId,
			joinedAt: deps.clock.now(),
		});
		if (result === "invalid") {
			throw new InvalidGroupInviteError();
		}
		return { groupId: group.id };
	};
}
