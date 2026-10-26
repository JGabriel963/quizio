import type { Group } from "./group";
import type { GroupRole } from "./group-member";

/** The steps of "Configurar seu grupo" and which are done (spec 034, RN-17). */
export interface GroupSetup {
	invited: boolean;
	/** Spec 038. */
	assigned: boolean;
	/** Spec 036. */
	posted: boolean;
}

/** Only the admin sees it, until it is dismissed or every step is done. */
export function groupSetupOf(
	group: Pick<Group, "setupDismissedAt">,
	memberCount: number,
	role: GroupRole,
): GroupSetup | null {
	if (role !== "admin" || group.setupDismissedAt) {
		return null;
	}
	const setup = { invited: memberCount > 1, assigned: false, posted: false };
	return setup.invited && setup.assigned && setup.posted ? null : setup;
}
