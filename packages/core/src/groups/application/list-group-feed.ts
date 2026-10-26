import {
	type GroupPostView,
	type GroupPostViewDeps,
	postViewsOf,
} from "./group-post-view";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupFeedCursor, GroupFeedQuery } from "./ports/group-feed-query";

/** "Mostrar mais publicações" brings this many more (spec 036, RN-18). */
export const GROUP_FEED_PAGE_SIZE = 20;

export type ListGroupFeed = (input: {
	userId: string;
	groupId: string;
	/** The `nextCursor` of the page before; absent for the first. */
	cursor?: GroupFeedCursor;
}) => Promise<{ posts: GroupPostView[]; nextCursor: GroupFeedCursor | null }>;

/** The Atividade tab's feed, newest first, by pages (spec 036, RN-18). */
export function createListGroupFeed(
	deps: GroupStoreDeps & GroupPostViewDeps & { groupFeed: GroupFeedQuery },
): ListGroupFeed {
	return async ({ cursor, ...input }) => {
		const { membership } = await requireMembership(deps, input);
		const records = await deps.groupFeed.listPosts(
			input.groupId,
			input.userId,
			{ limit: GROUP_FEED_PAGE_SIZE + 1, after: cursor ?? null },
		);
		const page = records.slice(0, GROUP_FEED_PAGE_SIZE);
		const last = page.at(-1);
		return {
			posts: await postViewsOf(deps, page, membership),
			nextCursor:
				records.length > GROUP_FEED_PAGE_SIZE && last
					? { createdAt: last.createdAt, id: last.id }
					: null,
		};
	};
}
