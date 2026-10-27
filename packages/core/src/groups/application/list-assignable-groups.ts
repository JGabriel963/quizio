import type { Clock } from "../../shared/application/ports/clock";
import {
	type GroupAssignmentRecord,
	isAssignmentOpen,
} from "../domain/group-assignment";
import { AssignmentNotShareableError } from "../domain/group-errors";
import { canAssign } from "../domain/group-permissions";
import type { GroupStoreDeps } from "./load-group";
import type { GroupAssignmentQuery } from "./ports/group-assignments";
import type { GroupFeedQuery } from "./ports/group-feed-query";
import type { GroupReads } from "./ports/group-reads";

export type ListAssignableGroups = (input: {
	userId: string;
	gameId: string;
}) => Promise<{
	groups: { id: string; name: string; alreadyAssigned: boolean }[];
}>;

/** The caller's own open assignment (spec 038, RN-25). */
export async function requireShareableAssignment(
	deps: { groupAssignmentQuery: GroupAssignmentQuery; clock: Clock },
	input: { userId: string; gameId: string },
): Promise<GroupAssignmentRecord> {
	const [record] = await deps.groupAssignmentQuery.findAssignments([
		input.gameId,
	]);
	if (
		!record ||
		record.ownerId !== input.userId ||
		!isAssignmentOpen(record, deps.clock.now())
	) {
		throw new AssignmentNotShareableError();
	}
	return record;
}

/**
 * "Atribuir a grupos": the groups where the user may assign, marking those
 * that already have this assignment (spec 038, RN-26).
 */
export function createListAssignableGroups(
	deps: GroupStoreDeps & {
		groupReads: GroupReads;
		groupFeed: GroupFeedQuery;
		groupAssignmentQuery: GroupAssignmentQuery;
		clock: Clock;
	},
): ListAssignableGroups {
	return async (input) => {
		await requireShareableAssignment(deps, input);
		const records = await deps.groupReads.listForUser(input.userId);
		const candidates = await Promise.all(
			records.map(async (record) => {
				const group = await deps.groups.findById(record.id);
				return group && canAssign(group, record.role) ? record : null;
			}),
		);
		const assignable = candidates.filter((record) => record !== null);
		const already = new Set(
			await deps.groupFeed.groupsWithAssignment(
				input.gameId,
				assignable.map((record) => record.id),
			),
		);
		return {
			groups: assignable
				.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
				.map((record) => ({
					id: record.id,
					name: record.name,
					alreadyAssigned: already.has(record.id),
				})),
		};
	};
}
