import { matchesGroupSearch } from "../domain/group-member";
import type { GroupSection } from "../domain/group-section";
import type { GroupReads } from "./ports/group-reads";

export interface GroupListItem {
	id: string;
	name: string;
	memberCount: number;
	/** Created (managed) or joined (joined). */
	since: Date;
}

export type ListGroups = (input: {
	userId: string;
	section: GroupSection;
	search?: string;
}) => Promise<{ items: GroupListItem[] }>;

/**
 * "Grupos que gerencio" or "Grupos em que participo", newest first, filtered
 * by name (spec 034, RN-07, RN-08). A user has few groups: no paging.
 */
export function createListGroups(deps: { groupReads: GroupReads }): ListGroups {
	return async ({ userId, section, search = "" }) => {
		const role = section === "managed" ? "admin" : "member";
		const records = await deps.groupReads.listForUser(userId);
		const items = records
			.filter(
				(record) =>
					record.role === role && matchesGroupSearch(record.name, search),
			)
			.sort((a, b) => b.since.getTime() - a.since.getTime())
			.map(({ id, name, memberCount, since }) => ({
				id,
				name,
				memberCount,
				since,
			}));
		return { items };
	};
}
