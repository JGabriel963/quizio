import {
	GroupPostNotFoundError,
	PostDeleteNotAllowedError,
} from "../domain/group-errors";
import { canManagePost } from "../domain/group-permissions";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupPostRepository } from "./ports/group-post-repository";

export type DeleteGroupPost = (input: {
	userId: string;
	groupId: string;
	postId: string;
}) => Promise<void>;

/**
 * "Excluir publicação": the post and its likes leave the group; the
 * assignment, its report and its link stay (spec 038, RN-20, RN-21).
 */
export function createDeleteGroupPost(
	deps: GroupStoreDeps & { groupPosts: GroupPostRepository },
): DeleteGroupPost {
	return async ({ postId, ...input }) => {
		const { membership } = await requireMembership(deps, input);
		const post = await deps.groupPosts.findPost(input.groupId, postId);
		if (!post) {
			throw new GroupPostNotFoundError();
		}
		if (!canManagePost(post, membership)) {
			throw new PostDeleteNotAllowedError();
		}
		await deps.groupPosts.deletePost(postId);
	};
}
