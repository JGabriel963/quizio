import type { Group } from "./group";
import type { GroupRole } from "./group-member";

/** The steps of "Configurar seu grupo" and which are done (spec 034, RN-17). */
export interface GroupSetup {
	invited: boolean;
	/** Spec 038. */
	assigned: boolean;
	/** Any post; an assignment counts (spec 038, RN-29). */
	posted: boolean;
}

/** Only the admin sees it, until it is dismissed or every step is done. */
export function groupSetupOf(
	group: Pick<Group, "setupDismissedAt">,
	memberCount: number,
	role: GroupRole,
	/** What the feed has (spec 038, RN-29). */
	feed: { assignments: number; posts: number } = { assignments: 0, posts: 0 },
): GroupSetup | null {
	if (role !== "admin" || group.setupDismissedAt) {
		return null;
	}
	const setup = {
		invited: memberCount > 1,
		assigned: feed.assignments > 0,
		posted: feed.posts > 0,
	};
	return setup.invited && setup.assigned && setup.posted ? null : setup;
}
