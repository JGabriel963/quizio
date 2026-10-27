import { RECENT_GROUPS_LIMIT } from "../domain/group-section";
import type { GroupReads } from "./ports/group-reads";

export type ListRecentGroups = (input: {
	userId: string;
}) => Promise<{ items: { id: string; name: string }[] }>;

/** "Grupos recentes": the last 5 the user opened and still belongs to (spec 034, RN-10). */
export function createListRecentGroups(deps: {
	groupReads: GroupReads;
}): ListRecentGroups {
	return async ({ userId }) => ({
		items: await deps.groupReads.recentForUser(userId, RECENT_GROUPS_LIMIT),
	});
}
