import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { assertAdmin } from "../domain/group-permissions";
import { type InboxSignalDeps, noticeGroupDeleted } from "./inbox-signals";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupPostRepository } from "./ports/group-post-repository";
import type { GroupUploadRepository } from "./ports/group-upload-repository";

export type DeleteGroup = (input: {
	userId: string;
	groupId: string;
}) => Promise<void>;

/**
 * For good and for everybody; the link stops working (spec 034, RN-37). The
 * files posted or waiting in it go after the rows (spec 036, RN-21).
 */
export function createDeleteGroup(
	deps: GroupStoreDeps & {
		groupPosts: GroupPostRepository;
		groupUploads: GroupUploadRepository;
		storage: ObjectStorage;
		clock: Clock;
	} & InboxSignalDeps,
): DeleteGroup {
	return async (input) => {
		const { group, membership } = await requireMembership(deps, input);
		assertAdmin(membership);
		const keys = [
			...(await deps.groupPosts.fileKeysOfGroup(input.groupId)),
			...(await deps.groupUploads.uploadKeysOfGroup(input.groupId)),
		];
		await noticeGroupDeleted(deps, group, deps.clock.now());
		await deps.groups.delete(input.groupId);
		await Promise.all(keys.map((key) => deps.storage.delete(key)));
	};
}
