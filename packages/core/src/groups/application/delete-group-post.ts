import type { ObjectStorage } from "../../shared/application/ports/object-storage";
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
 * "Excluir publicação": the post and its likes leave the group, and so does
 * its file, after the row (spec 036, RN-20). An assignment, its report and
 * its link stay (spec 038, RN-21).
 */
export function createDeleteGroupPost(
	deps: GroupStoreDeps & {
		groupPosts: GroupPostRepository;
		storage: ObjectStorage;
	},
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
		const deleted = await deps.groupPosts.deletePost(postId);
		if (deleted?.file) {
			await deps.storage.delete(deleted.file.key);
		}
	};
}
