import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	assertMediaContentType,
	assertMediaSize,
	MEDIA_EXTENSIONS,
} from "../domain/media-policy";

const UPLOAD_URL_TTL_SECONDS = 300;

export interface RequestMediaUploadInput {
	ownerId: string;
	contentType: string;
	sizeBytes: number;
}

export interface RequestMediaUploadOutput {
	key: string;
	uploadUrl: string;
	method: "PUT";
	headers: Record<string, string>;
	publicUrl: string;
}

export type RequestMediaUpload = (
	input: RequestMediaUploadInput,
) => Promise<RequestMediaUploadOutput>;

/**
 * Validates an upload against the media policy and returns a presigned URL so
 * the browser uploads straight to object storage — file bytes never pass
 * through our serverless functions.
 */
export function createRequestMediaUpload(deps: {
	storage: ObjectStorage;
	ids: IdGenerator;
}): RequestMediaUpload {
	return async ({ ownerId, contentType, sizeBytes }) => {
		const mediaType = assertMediaContentType(contentType);
		assertMediaSize(sizeBytes);

		const key = `media/${ownerId}/${deps.ids.generate()}.${MEDIA_EXTENSIONS[mediaType]}`;
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
			publicUrl: deps.storage.getPublicUrl(key),
		};
	};
}
