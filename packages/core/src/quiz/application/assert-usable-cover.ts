import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { isMediaKeyOwnedBy } from "../../shared/domain/media-key";
import { InvalidCoverImageError } from "../domain/quiz";

/** A cover must be an upload that exists and belongs to the quiz owner (RN-15). */
export async function assertUsableCover(
	storage: Pick<ObjectStorage, "exists">,
	key: string,
	ownerId: string,
): Promise<void> {
	if (!isMediaKeyOwnedBy(key, ownerId) || !(await storage.exists(key))) {
		throw new InvalidCoverImageError(
			"Cover image must be an existing upload owned by the quiz owner",
		);
	}
}
