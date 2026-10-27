import type { GroupInbox } from "../application/ports/group-inbox";

/** Records who the groups told, in order; `failing` makes every call throw. */
export class RecordingGroupInbox implements GroupInbox {
	readonly signals: string[][] = [];
	readonly notices: {
		kind: "removed" | "groupDeleted";
		userIds: string[];
		groupName: string;
	}[] = [];
	failing = false;

	clear(): void {
		this.signals.length = 0;
		this.notices.length = 0;
	}

	async signal(userIds: readonly string[]): Promise<void> {
		this.#check();
		this.signals.push([...userIds]);
	}

	async noticeRemoved(userId: string, groupName: string): Promise<void> {
		this.#check();
		this.notices.push({ kind: "removed", userIds: [userId], groupName });
	}

	async noticeDeleted(
		userIds: readonly string[],
		_groupId: string,
		groupName: string,
	): Promise<void> {
		this.#check();
		this.notices.push({
			kind: "groupDeleted",
			userIds: [...userIds],
			groupName,
		});
	}

	#check(): void {
		if (this.failing) {
			throw new Error("The inbox is down");
		}
	}
}
