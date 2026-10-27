import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import { AlreadyAssignedToGroupError } from "../domain/group-errors";
import { assertCanAssign } from "../domain/group-permissions";
import { requireShareableAssignment } from "./list-assignable-groups";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupAssignmentQuery } from "./ports/group-assignments";
import type { GroupFeedQuery } from "./ports/group-feed-query";
import type { GroupPostRepository } from "./ports/group-post-repository";

export type AssignToGroups = (input: {
	userId: string;
	gameId: string;
	groupIds: readonly string[];
}) => Promise<{ assigned: number }>;

/**
 * "Atribuir a grupos" (spec 038, RN-25 to RN-28): an open assignment of the
 * caller goes, without a message, to every chosen group. Everything is
 * checked before the first post; two requests at once leave one post per
 * group, by the database's unique index.
 */
export function createAssignToGroups(
	deps: GroupStoreDeps & {
		groupAssignmentQuery: GroupAssignmentQuery;
		groupFeed: GroupFeedQuery;
		groupPosts: GroupPostRepository;
		ids: IdGenerator;
		clock: Clock;
	},
): AssignToGroups {
	return async ({ userId, gameId, groupIds }) => {
		await requireShareableAssignment(deps, { userId, gameId });
		const unique = [...new Set(groupIds)];
		for (const groupId of unique) {
			const { group, membership } = await requireMembership(deps, {
				groupId,
				userId,
			});
			assertCanAssign(group, membership);
		}
		if (
			(await deps.groupFeed.groupsWithAssignment(gameId, unique)).length > 0
		) {
			throw new AlreadyAssignedToGroupError();
		}
		const now = deps.clock.now();
		let assigned = 0;
		for (const groupId of unique) {
			const result = await deps.groupPosts.createPost({
				id: deps.ids.generate(),
				groupId,
				authorId: userId,
				kind: "assignment",
				file: null,
				message: null,
				gameId,
				sharedQuizId: null,
				createdAt: now,
			});
			if (result === "created") {
				assigned++;
			}
		}
		return { assigned };
	};
}
