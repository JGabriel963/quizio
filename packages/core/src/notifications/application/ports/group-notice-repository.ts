/**
 * What is left of a group for someone who lost it (spec 040, RN-06; ADR
 * 0020): the group's name is a copy, because its rows are gone.
 */
export interface GroupNotice {
	/** For a deletion, derived from (group, member): deleting twice adds nothing. */
	id: string;
	userId: string;
	kind: "removed" | "groupDeleted";
	groupName: string;
	at: Date;
}

export interface GroupNoticeRepository {
	/** Notices whose id already exists are left as they were. */
	add(notices: readonly GroupNotice[]): Promise<void>;
}
