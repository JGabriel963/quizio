import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { groupFileKeyFor } from "../../shared/domain/media-key";
import { type GroupFileType, parseGroupFile } from "../domain/group-file";
import { type GroupStoreDeps, requireMembership } from "./load-group";
import type { GroupUploadRepository } from "./ports/group-upload-repository";

const UPLOAD_URL_TTL_SECONDS = 300;
/** A file nobody posted is deleted after this (spec 036, RN-21). */
export const GROUP_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
/** How many expired uploads one request sweeps, so it stays quick. */
const SWEEP_LIMIT = 20;

export type RequestGroupUpload = (input: {
	userId: string;
	groupId: string;
	type: GroupFileType;
	contentType: string;
	sizeBytes: number;
	fileName: string;
}) => Promise<{
	key: string;
	uploadUrl: string;
	method: "PUT";
	headers: Record<string, string>;
}>;

/**
 * A presigned URL for an image or a PDF of "Criar publicação" (spec 036,
 * RN-09, RN-11; ADR 0017): the browser sends it straight to storage, under
 * the group, with its name for the download. With no timers on the server,
 * each request first deletes a few uploads nobody posted in 24 hours.
 */
export function createRequestGroupUpload(
	deps: GroupStoreDeps & {
		groupUploads: GroupUploadRepository;
		storage: ObjectStorage;
		ids: IdGenerator;
		clock: Clock;
	},
): RequestGroupUpload {
	return async ({ userId, groupId, ...file }) => {
		await requireMembership(deps, { userId, groupId });
		const parsed = parseGroupFile(file);

		const now = deps.clock.now();
		const expired = await deps.groupUploads.takeExpiredUploads(
			new Date(now.getTime() - GROUP_UPLOAD_TTL_MS),
			SWEEP_LIMIT,
		);
		await Promise.all(expired.map((key) => deps.storage.delete(key)));

		const key = groupFileKeyFor(groupId, deps.ids.generate(), parsed.extension);
		await deps.groupUploads.addUpload({
			key,
			groupId,
			uploaderId: userId,
			file: {
				type: parsed.type,
				name: parsed.name,
				sizeBytes: parsed.sizeBytes,
			},
			createdAt: now,
		});
		const upload = await deps.storage.createPresignedUpload({
			key,
			contentType: parsed.contentType,
			contentLength: parsed.sizeBytes,
			expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
			contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(parsed.name)}`,
		});
		return {
			key,
			uploadUrl: upload.url,
			method: upload.method,
			headers: upload.headers,
		};
	};
}
