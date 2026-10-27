/**
 * How the groups tell people they have news (spec 040; ADR 0020). Posts and
 * joins are read later from the groups themselves, so a signal is only a
 * hint; removals and deletions leave a notice, because their rows go.
 */
export interface GroupInbox {
	signal(userIds: readonly string[]): Promise<void>;
	noticeRemoved(userId: string, groupName: string, at: Date): Promise<void>;
	noticeDeleted(
		userIds: readonly string[],
		groupId: string,
		groupName: string,
		at: Date,
	): Promise<void>;
}
