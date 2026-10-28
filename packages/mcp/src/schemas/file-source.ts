import type { RemoteFileTarget } from "@quizio/core/media/application/ports/remote-file-uploads";
import { z } from "zod";

import type { ToolContext } from "../define-tool";

/**
 * Where a file comes from (spec 044, RN-24): a public link Quizio downloads,
 * for agents that cannot upload, or the key `request_upload` gave after the
 * agent PUT the file there.
 */
export const fileSource = z
	.union([
		z.object({
			url: z
				.string()
				.describe(
					"A public http(s) link to the file. Quizio downloads it; private and internal addresses are refused.",
				),
		}),
		z.object({
			uploadKey: z
				.string()
				.describe(
					"The uploadKey request_upload returned, after you PUT the file to its uploadUrl.",
				),
		}),
	])
	.describe(
		"A file: { url } for a public link, or { uploadKey } after request_upload.",
	);

export type FileSource = z.infer<typeof fileSource>;

/** The storage key of the file, importing it first when it is a link. */
export async function resolveFile(
	source: FileSource,
	target: RemoteFileTarget,
	{ useCases, identity }: ToolContext,
): Promise<string> {
	if ("uploadKey" in source) {
		return source.uploadKey;
	}
	const { key } = await useCases.importRemoteFile({
		ownerId: identity.userId,
		url: source.url,
		target,
	});
	return key;
}
