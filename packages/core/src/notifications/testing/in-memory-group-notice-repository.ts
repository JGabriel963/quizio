import type {
	GroupNotice,
	GroupNoticeRepository,
} from "../application/ports/group-notice-repository";

export class InMemoryGroupNoticeRepository implements GroupNoticeRepository {
	readonly #notices = new Map<string, GroupNotice>();

	async add(notices: readonly GroupNotice[]): Promise<void> {
		for (const notice of notices) {
			if (!this.#notices.has(notice.id)) {
				this.#notices.set(notice.id, { ...notice });
			}
		}
	}

	/** Test helper: one user's notices. */
	of(userId: string): GroupNotice[] {
		return [...this.#notices.values()].filter(
			(notice) => notice.userId === userId,
		);
	}
}
