import type { Clock } from "../../shared/application/ports/clock";
import { GroupPostNotFoundError } from "../domain/group-errors";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupFeedQuery } from "./ports/group-feed-query";
import type { GroupPostRepository } from "./ports/group-post-repository";

export type SetPostLike = (input: {
	userId: string;
	groupId: string;
	postId: string;
	liked: boolean;
}) => Promise<{ liked: boolean; likeCount: number }>;

/**
 * "Curtir" and "Curtida" (spec 038, RN-17, RN-18): the wanted state, not a
 * toggle, so a repeated request changes nothing.
 */
export function createSetPostLike(
	deps: GroupStoreDeps & {
		groupPosts: GroupPostRepository;
		groupFeed: GroupFeedQuery;
		clock: Clock;
	},
): SetPostLike {
	return async ({ postId, liked, ...input }) => {
		await requireMembership(deps, input);
		const post = await deps.groupPosts.findPost(input.groupId, postId);
		if (!post) {
			throw new GroupPostNotFoundError();
		}
		await deps.groupPosts.setLike(
			postId,
			input.userId,
			liked,
			deps.clock.now(),
		);
		return { liked, likeCount: await deps.groupFeed.likeCount(postId) };
	};
}
