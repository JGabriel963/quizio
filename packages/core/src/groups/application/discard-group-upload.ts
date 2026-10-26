import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupUploadRepository } from "./ports/group-upload-repository";

export type DiscardGroupUpload = (input: {
	userId: string;
	groupId: string;
	key: string;
}) => Promise<void>;

/**
 * Cancelar and the X of "Criar publicação" (spec 036, RN-08): one's own
 * pending upload goes, with its object; anything else is left alone.
 */
export function createDiscardGroupUpload(
	deps: GroupStoreDeps & {
		groupUploads: GroupUploadRepository;
		storage: ObjectStorage;
	},
): DiscardGroupUpload {
	return async ({ key, ...input }) => {
		await requireMembership(deps, input);
		if (await deps.groupUploads.removeUpload(key, input.userId)) {
			await deps.storage.delete(key);
		}
	};
}
