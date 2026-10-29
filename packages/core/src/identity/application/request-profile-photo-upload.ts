import {
	type MediaUploadDeps,
	recordMediaUpload,
} from "../../media/application/media-uploads";
import {
	assertMediaContentType,
	assertMediaSize,
	MEDIA_EXTENSIONS,
} from "../../media/domain/media-policy";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	reserveUpload,
	type UploadLimitDeps,
} from "../../shared/application/upload-limit";
import { profilePhotoKeyFor } from "../../shared/domain/media-key";

const UPLOAD_URL_TTL_SECONDS = 300;

export interface ProfilePhotoUpload {
	key: string;
	uploadUrl: string;
	method: "PUT";
	headers: Record<string, string>;
}

export type RequestProfilePhotoUpload = (input: {
	userId: string;
	contentType: string;
	sizeBytes: number;
}) => Promise<ProfilePhotoUpload>;

/**
 * The cropped square goes straight from the browser to storage, under the
 * user's own prefix, with the media policy (spec 039, RN-08; ADR 0019). It
 * counts against the person's uploads of the hour and is recorded, so a photo
 * never set is deleted a day later (audit L4).
 */
export function createRequestProfilePhotoUpload(
	deps: {
		storage: ObjectStorage;
		ids: IdGenerator;
	} & MediaUploadDeps &
		UploadLimitDeps,
): RequestProfilePhotoUpload {
	return async ({ userId, contentType, sizeBytes }) => {
		const mediaType = assertMediaContentType(contentType);
		assertMediaSize(sizeBytes);
		await reserveUpload(deps, userId);
		const key = profilePhotoKeyFor(
			userId,
			deps.ids.generate(),
			MEDIA_EXTENSIONS[mediaType],
		);
		await recordMediaUpload(deps, { key, ownerId: userId });
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
