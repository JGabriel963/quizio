import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { isSourceKeyOwnedBy } from "../../shared/domain/media-key";
import type { SourceUploadRepository } from "./ports/source-upload-repository";

export type DiscardSource = (input: {
	ownerId: string;
	key: string;
}) => Promise<void>;

/**
 * Deletes the PDF when the assistant closes (spec 027, RN-18). Best effort and
 * idempotent; a key that is not the caller's source is left alone.
 */
export function createDiscardSource(deps: {
	storage: Pick<ObjectStorage, "delete">;
	sourceUploads: SourceUploadRepository;
}): DiscardSource {
	return async ({ ownerId, key }) => {
		if (!isSourceKeyOwnedBy(key, ownerId)) {
			return;
		}
		await deps.storage.delete(key);
		await deps.sourceUploads.remove(key);
	};
}
