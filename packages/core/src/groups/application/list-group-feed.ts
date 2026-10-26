import {
	type GroupPostView,
	type GroupPostViewDeps,
	postViewsOf,
} from "./group-post-view";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupFeedQuery } from "./ports/group-feed-query";

export type ListGroupFeed = (input: {
	userId: string;
	groupId: string;
}) => Promise<{ posts: GroupPostView[] }>;

/** The Atividade tab's feed, newest first (spec 038, RN-13). */
export function createListGroupFeed(
	deps: GroupStoreDeps & GroupPostViewDeps & { groupFeed: GroupFeedQuery },
): ListGroupFeed {
	return async (input) => {
		const { membership } = await requireMembership(deps, input);
		const posts = await deps.groupFeed.listPosts(input.groupId, input.userId);
		return { posts: await postViewsOf(deps, posts, membership) };
	};
}
