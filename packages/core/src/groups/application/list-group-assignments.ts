import {
	type GroupAssignmentSort,
	sortGroupAssignments,
} from "../domain/group-assignment";
import {
	type GroupAssignmentCard,
	type GroupPostViewDeps,
	postViewsOf,
} from "./group-post-view";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupFeedQuery } from "./ports/group-feed-query";

/** A row or card of the Atribuições tab (spec 038, RN-23). */
export interface GroupAssignmentView extends GroupAssignmentCard {
	postId: string;
	assignedAt: Date;
	assignedBy: { userId: string; name: string };
	canSeeReport: boolean;
	canDelete: boolean;
}

export type ListGroupAssignments = (input: {
	userId: string;
	groupId: string;
	sort: GroupAssignmentSort;
}) => Promise<{ items: GroupAssignmentView[] }>;

/** The group's open assignments, as "Classificar por" says (RN-22, RN-23). */
export function createListGroupAssignments(
	deps: GroupStoreDeps & GroupPostViewDeps & { groupFeed: GroupFeedQuery },
): ListGroupAssignments {
	return async ({ sort, ...input }) => {
		const { membership } = await requireMembership(deps, input);
		const posts = await deps.groupFeed.listPosts(input.groupId, input.userId);
		const views = await postViewsOf(deps, posts, membership);
		const items = views.flatMap((view) =>
			view.attachment
				? [
						{
							...view.attachment,
							id: view.id,
							postId: view.id,
							assignedAt: view.createdAt,
							assignedBy: view.author,
							canSeeReport: view.canSeeReport,
							canDelete: view.canDelete,
						},
					]
				: [],
		);
		return {
			items: sortGroupAssignments(items, sort).map(
				({ id: _id, ...item }) => item,
			),
		};
	};
}
