import { assertAdmin } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { InviteCodeGenerator } from "./ports/invite-code-generator";

export type ResetGroupInvite = (input: {
	userId: string;
	groupId: string;
}) => Promise<{ code: string }>;

/**
 * "Redefinir link": a new code, so the old link stops working; who joined
 * stays (spec 034, RN-24).
 */
export function createResetGroupInvite(
	deps: GroupStoreDeps & { inviteCodes: InviteCodeGenerator },
): ResetGroupInvite {
	return async (input) => {
		const { membership } = await requireMembership(deps, input);
		assertAdmin(membership);
		const code = deps.inviteCodes.generate();
		await deps.groups.saveInviteCode(input.groupId, code);
		return { code };
	};
}
