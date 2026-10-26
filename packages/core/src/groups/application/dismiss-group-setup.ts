import type { Clock } from "../../shared/application/ports/clock";
import { assertAdmin } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";

export type DismissGroupSetup = (input: {
	userId: string;
	groupId: string;
}) => Promise<void>;

/** "Pular configuração": the card does not come back (spec 034, RN-17). */
export function createDismissGroupSetup(
	deps: GroupStoreDeps & { clock: Clock },
): DismissGroupSetup {
	return async (input) => {
		const { membership } = await requireMembership(deps, input);
		assertAdmin(membership);
		await deps.groups.saveSetupDismissed(input.groupId, deps.clock.now());
	};
}
