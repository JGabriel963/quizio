import {
	assertMediaContentType,
	assertMediaSize,
	MEDIA_EXTENSIONS,
} from "../../media/domain/media-policy";
import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { themeFileKeyFor } from "../../shared/domain/media-key";
import type { ThemeUploadRepository } from "./ports/theme-upload-repository";

const UPLOAD_URL_TTL_SECONDS = 300;
/** A file nobody saved in a theme is deleted after this (spec 043, RN-29). */
export const THEME_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
/** How many expired uploads one request sweeps, so it stays quick. */
const SWEEP_LIMIT = 20;

export type RequestThemeUpload = (input: {
	ownerId: string;
	contentType: string;
	sizeBytes: number;
}) => Promise<{
	key: string;
	uploadUrl: string;
	method: "PUT";
	headers: Record<string, string>;
}>;

/**
 * A presigned URL for a theme's logo or background (spec 043, RN-07): the
 * media policy, under `themes/{owner}/`, recorded as pending until a theme
 * takes it. With no timers on the server, each request first deletes a few
 * uploads nobody saved in 24 hours (RN-29), as the groups do (spec 036).
 */
export function createRequestThemeUpload(deps: {
	themeUploads: ThemeUploadRepository;
	storage: ObjectStorage;
	ids: IdGenerator;
	clock: Clock;
}): RequestThemeUpload {
	return async ({ ownerId, contentType, sizeBytes }) => {
		const mediaType = assertMediaContentType(contentType);
		assertMediaSize(sizeBytes);

		const now = deps.clock.now();
		const expired = await deps.themeUploads.takeExpiredThemeUploads(
			new Date(now.getTime() - THEME_UPLOAD_TTL_MS),
			SWEEP_LIMIT,
		);
		await Promise.all(expired.map((key) => deps.storage.delete(key)));

		const key = themeFileKeyFor(
			ownerId,
			deps.ids.generate(),
			MEDIA_EXTENSIONS[mediaType],
		);
		await deps.themeUploads.addThemeUpload({ key, ownerId, createdAt: now });
		const upload = await deps.storage.createPresignedUpload({
			key,
			contentType: mediaType,
			contentLength: sizeBytes,
			expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
		});
		return {
			key,
			uploadUrl: upload.url,
			method: upload.method,
			headers: upload.headers,
		};
	};
}
