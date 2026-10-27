import { normalizeSearchText } from "../../shared/domain/search-text";

/** The admin and everybody else (spec 034, RN-02). */
export const GROUP_ROLES = ["admin", "member"] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

/** One user in one group; the admin is a member too (RN-01; ADR 0015). */
export interface GroupMember {
	groupId: string;
	userId: string;
	role: GroupRole;
	joinedAt: Date;
}

const byName = new Intl.Collator("pt-BR", { sensitivity: "base" });

/** The admin first, the others by name (RN-32). */
export function sortMembers<T extends { name: string; role: GroupRole }>(
	members: readonly T[],
): T[] {
	return [...members].sort((a, b) => {
		if (a.role !== b.role) {
			return a.role === "admin" ? -1 : 1;
		}
		return byName.compare(a.name, b.name);
	});
}

/** Without case or accents; an empty search matches all (RN-08, RN-31). */
export function matchesGroupSearch(text: string, search: string): boolean {
	return normalizeSearchText(text).includes(normalizeSearchText(search));
}

/** A member's email is for the admin only (RN-34). */
export function canSeeMemberEmail(viewerRole: GroupRole): boolean {
	return viewerRole === "admin";
}
