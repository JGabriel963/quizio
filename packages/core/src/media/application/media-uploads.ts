import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type {
	MediaUploadRepository,
	MediaUsage,
} from "./ports/media-upload-repository";

/** An image or photo nothing used by then was abandoned (audit L4). */
export const MEDIA_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
/** How many expired uploads one new upload sweeps, so it stays quick. */
const SWEEP_LIMIT = 20;

export interface MediaUploadDeps {
	mediaUploads: MediaUploadRepository;
	mediaUsage: MediaUsage;
	storage: Pick<ObjectStorage, "delete">;
	clock: Clock;
}

/**
 * Records an image or photo about to be sent, as `sources/`, `groups/` and
 * `themes/` already do: with no timers on the server, each new one first
 * sweeps a few older than a day and deletes the files nothing points at. A
 * file in use (a cover, a question, a version, a profile) only loses its row,
 * so a use this code did not foresee never loses its file.
 */
export async function recordMediaUpload(
	deps: MediaUploadDeps,
	upload: { key: string; ownerId: string },
): Promise<void> {
	const now = deps.clock.now();
	const expired = await deps.mediaUploads.takeExpiredMediaUploads(
		new Date(now.getTime() - MEDIA_UPLOAD_TTL_MS),
		SWEEP_LIMIT,
	);
	for (const key of expired) {
		if (!(await deps.mediaUsage.isMediaInUse(key))) {
			await deps.storage.delete(key);
		}
	}
	await deps.mediaUploads.addMediaUpload({ ...upload, createdAt: now });
}
