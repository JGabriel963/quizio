/**
 * An assignment as a group shows it (spec 038; ADR 0016): read from the game,
 * the report, the quiz and the creator's account. It reuses no function of
 * the game context.
 */
export interface GroupAssignmentRecord {
	gameId: string;
	ownerId: string;
	ownerName: string;
	/** The report's own name, or the game's title. */
	name: string;
	questionCount: number;
	/** Null once the quiz was deleted (spec 015, RN-05). */
	coverImageKey: string | null;
	expiresAt: Date;
	endedAt: Date | null;
}

/** The card of a post or of the Atribuições tab. */
export interface GroupAssignmentAttachment {
	gameId: string;
	name: string;
	questionCount: number;
	coverImageKey: string | null;
	ownerName: string;
	remainingMs: number;
}

/** Not ended and before its deadline, on the server's clock. */
export function isAssignmentOpen(
	record: GroupAssignmentRecord,
	now: Date,
): boolean {
	return record.endedAt === null && record.expiresAt.getTime() > now.getTime();
}

/**
 * The post's attachment, or null once the assignment ended, ran out or was
 * deleted: the post stays without it (RN-16).
 */
export function attachmentOf(
	record: GroupAssignmentRecord | null,
	now: Date,
): GroupAssignmentAttachment | null {
	if (!record || !isAssignmentOpen(record, now)) {
		return null;
	}
	return {
		gameId: record.gameId,
		name: record.name,
		questionCount: record.questionCount,
		coverImageKey: record.coverImageKey,
		ownerName: record.ownerName,
		remainingMs: record.expiresAt.getTime() - now.getTime(),
	};
}

/** "Classificar por" (RN-22). */
export const GROUP_ASSIGNMENT_SORTS = ["recent", "oldest", "deadline"] as const;
export type GroupAssignmentSort = (typeof GROUP_ASSIGNMENT_SORTS)[number];

export function sortGroupAssignments<
	T extends { id: string; assignedAt: Date; remainingMs: number },
>(items: readonly T[], sort: GroupAssignmentSort): T[] {
	const byAssigned = (a: T, b: T) =>
		a.assignedAt.getTime() - b.assignedAt.getTime() || a.id.localeCompare(b.id);
	const compare: Record<GroupAssignmentSort, (a: T, b: T) => number> = {
		recent: (a, b) => -byAssigned(a, b),
		oldest: byAssigned,
		deadline: (a, b) => a.remainingMs - b.remainingMs || byAssigned(a, b),
	};
	return [...items].sort(compare[sort]);
}

/**
 * The newest assignment posts the Atribuições tab reads (audit L9): an
 * assignment is open for 28 days by default, so the open ones are among them.
 */
export const GROUP_ASSIGNMENTS_READ_LIMIT = 500;
