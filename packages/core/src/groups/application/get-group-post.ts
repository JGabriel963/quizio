import { GroupPostNotFoundError } from "../domain/group-errors";
import {
	type GroupPostView,
	type GroupPostViewDeps,
	postViewsOf,
} from "./group-post-view";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupFeedQuery } from "./ports/group-feed-query";

export type GetGroupPost = (input: {
	userId: string;
	groupId: string;
	postId: string;
}) => Promise<GroupPostView>;

/**
 * One post of the feed, as the feed shows it, for the page a notification
 * opens (spec 040, RN-19, RN-20). Only the group's members see it.
 */
export function createGetGroupPost(
	deps: GroupStoreDeps & GroupPostViewDeps & { groupFeed: GroupFeedQuery },
): GetGroupPost {
	return async ({ postId, ...input }) => {
		const { membership } = await requireMembership(deps, input);
		const record = await deps.groupFeed.findPostRecord(
			input.groupId,
			postId,
			input.userId,
		);
		if (!record) {
			throw new GroupPostNotFoundError();
		}
		const [view] = await postViewsOf(deps, [record], membership);
		if (!view) {
			throw new GroupPostNotFoundError();
		}
		return view;
	};
}
