import type { GroupInbox } from "./ports/group-inbox";
import type { GroupReads } from "./ports/group-reads";

export interface InboxSignalDeps {
	groupReads: GroupReads;
	groupInbox: GroupInbox;
}

/**
 * Best effort, after the write, as `publishToGame`: news never undoes what
 * was done (spec 040, RN-11; ADR 0020).
 */
async function bestEffort(task: () => Promise<void>): Promise<void> {
	try {
		await task();
	} catch {
		// The bell asks again by itself; the post or the change stays.
	}
}

/** Every member of the group but who acted (RN-01 to RN-04). */
export function signalOtherMembers(
	deps: InboxSignalDeps,
	groupId: string,
	actorId: string,
): Promise<void> {
	return bestEffort(async () => {
		const members = await deps.groupReads.members(groupId);
		const others = members
			.map((member) => member.userId)
			.filter((userId) => userId !== actorId);
		if (others.length > 0) {
			await deps.groupInbox.signal(others);
		}
	});
}

export function signalUsers(
	deps: Pick<InboxSignalDeps, "groupInbox">,
	userIds: readonly string[],
): Promise<void> {
	return bestEffort(() => deps.groupInbox.signal(userIds));
}

export function noticeRemoved(
	deps: Pick<InboxSignalDeps, "groupInbox">,
	userId: string,
	groupName: string,
	at: Date,
): Promise<void> {
	return bestEffort(() => deps.groupInbox.noticeRemoved(userId, groupName, at));
}

/** Read the members before the group goes: the notice needs them (RN-06). */
export function noticeGroupDeleted(
	deps: InboxSignalDeps,
	group: { id: string; name: string; adminId: string },
	at: Date,
): Promise<void> {
	return bestEffort(async () => {
		const members = (await deps.groupReads.members(group.id))
			.map((member) => member.userId)
			.filter((userId) => userId !== group.adminId);
		if (members.length > 0) {
			await deps.groupInbox.noticeDeleted(members, group.id, group.name, at);
		}
	});
}
