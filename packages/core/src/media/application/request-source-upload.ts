import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { sourceKeyFor } from "../../shared/domain/media-key";
import {
	assertSourceContentType,
	assertSourceSize,
} from "../domain/source-policy";
import type { SourceUploadRepository } from "./ports/source-upload-repository";

const UPLOAD_URL_TTL_SECONDS = 300;
/** A source the assistant did not discard is deleted after this (RN-18). */
export const SOURCE_TTL_MS = 24 * 60 * 60 * 1000;
/** How many expired sources one upload sweeps, so it stays quick. */
const SWEEP_LIMIT = 20;

export interface RequestSourceUploadInput {
	ownerId: string;
	contentType: string;
	sizeBytes: number;
}

export interface RequestSourceUploadOutput {
	key: string;
	uploadUrl: string;
	method: "PUT";
	headers: Record<string, string>;
}

export type RequestSourceUpload = (
	input: RequestSourceUploadInput,
) => Promise<RequestSourceUploadOutput>;

/**
 * A presigned URL for the PDF the creation assistant reads (spec 027, RN-12,
 * RN-13): the browser sends it straight to storage, as with images. With no
 * timers on the server, each new upload first deletes a few sources older than
 * 24 hours that nobody discarded (RN-18).
 */
export function createRequestSourceUpload(deps: {
	storage: ObjectStorage;
	sourceUploads: SourceUploadRepository;
	ids: IdGenerator;
	clock: Clock;
}): RequestSourceUpload {
	return async ({ ownerId, contentType, sizeBytes }) => {
		const mediaType = assertSourceContentType(contentType);
		assertSourceSize(sizeBytes);

		const now = deps.clock.now();
		const expired = await deps.sourceUploads.takeExpired(
			new Date(now.getTime() - SOURCE_TTL_MS),
			SWEEP_LIMIT,
		);
		await Promise.all(expired.map((key) => deps.storage.delete(key)));

		const key = sourceKeyFor(ownerId, deps.ids.generate());
		await deps.sourceUploads.add({ key, ownerId, createdAt: now });
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
