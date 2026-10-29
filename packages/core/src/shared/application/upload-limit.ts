import {
	REMOTE_FILE_LIMIT,
	TooManyUploadsError,
	UPLOAD_LIMIT,
	UPLOAD_WINDOW_MS,
} from "../domain/upload-limit";
import type { AttemptLimiter } from "./ports/attempt-limiter";
import type { Clock } from "./ports/clock";

export interface UploadLimitDeps {
	attempts: AttemptLimiter;
	clock: Clock;
}

async function reserve(
	deps: UploadLimitDeps,
	key: string,
	limit: number,
): Promise<void> {
	const allowed = await deps.attempts.reserve(
		key,
		UPLOAD_WINDOW_MS,
		limit,
		deps.clock.now(),
	);
	if (!allowed) {
		throw new TooManyUploadsError("Too many files sent; try again later");
	}
}

/** Takes one of the uploads a person may ask for in the hour (audit L4). */
export function reserveUpload(
	deps: UploadLimitDeps,
	ownerId: string,
): Promise<void> {
	return reserve(deps, `upload:${ownerId}`, UPLOAD_LIMIT);
}

/** Takes one of the files a person may have fetched from a link in the hour. */
export function reserveRemoteFile(
	deps: UploadLimitDeps,
	ownerId: string,
): Promise<void> {
	return reserve(deps, `remote-file:${ownerId}`, REMOTE_FILE_LIMIT);
}
