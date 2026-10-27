import type { GroupRole } from "../../domain/group-member";

/** One of a user's groups, as the lists show it (spec 034, RN-08). */
export interface GroupListRecord {
	id: string;
	name: string;
	/** The user's role in it. */
	role: GroupRole;
	memberCount: number;
	/** When the admin created it, or when the member joined it. */
	since: Date;
}

/** A member with what their account tells (RN-32, RN-34). */
export interface GroupMemberRecord {
	userId: string;
	name: string;
	email: string;
	role: GroupRole;
	joinedAt: Date;
}

/**
 * Read model over the groups and the accounts: names and emails live in the
 * users' accounts, which the core does not know (ADR 0015).
 */
export interface GroupReads {
	listForUser(userId: string): Promise<GroupListRecord[]>;
	/** Most recent first, only groups the user still belongs to (RN-10). */
	recentForUser(
		userId: string,
		limit: number,
	): Promise<{ id: string; name: string }[]>;
	members(groupId: string): Promise<GroupMemberRecord[]>;
}
