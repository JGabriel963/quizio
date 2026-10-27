import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { isGroupFileKeyOf } from "../../shared/domain/media-key";
import { GroupUploadNotFoundError } from "../domain/group-errors";
import {
	assertPostHasContent,
	parseOptionalPostMessage,
} from "../domain/group-post";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupPostRepository } from "./ports/group-post-repository";

export type CreateGroupPost = (input: {
	userId: string;
	groupId: string;
	message: string;
	/** The image or PDF sent with `requestGroupUpload`. */
	uploadKey?: string;
}) => Promise<{ postId: string }>;

/**
 * "Publicar" in "Criar publicação" (spec 036): any member posts text, a file,
 * or both (RN-01, RN-06). A file is the member's pending upload in this
 * group, already in the bucket, and is posted once (RN-21; ADR 0017). An
 * assignment in the post goes through `assignInGroup` instead.
 */
export function createCreateGroupPost(
	deps: GroupStoreDeps & {
		groupPosts: GroupPostRepository;
		storage: ObjectStorage;
		ids: IdGenerator;
		clock: Clock;
	},
): CreateGroupPost {
	return async ({ message: rawMessage, uploadKey, ...input }) => {
		const { group } = await requireMembership(deps, input);
		const message = parseOptionalPostMessage(rawMessage);
		const post = {
			id: deps.ids.generate(),
			groupId: group.id,
			authorId: input.userId,
			kind: "message" as const,
			message,
			gameId: null,
			sharedQuizId: null,
			createdAt: deps.clock.now(),
		};

		if (uploadKey === undefined) {
			assertPostHasContent(message, false);
			await deps.groupPosts.createPost({ ...post, file: null });
			return { postId: post.id };
		}

		if (
			!isGroupFileKeyOf(uploadKey, group.id) ||
			!(await deps.storage.exists(uploadKey))
		) {
			throw new GroupUploadNotFoundError();
		}
		const created = await deps.groupPosts.createMessageFromUpload(post, {
			key: uploadKey,
			uploaderId: input.userId,
		});
		if (created === "missing") {
			throw new GroupUploadNotFoundError();
		}
		return { postId: post.id };
	};
}
