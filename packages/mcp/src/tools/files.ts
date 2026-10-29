import { z } from "zod";

import { defineTool, type ToolContext } from "../define-tool";

/** How long the address request_upload gives stays valid. */
const UPLOAD_URL_TTL_SECONDS = 300;

async function uploadFor(
	input: {
		purpose: "quizImage" | "themeImage" | "groupFile";
		contentType: string;
		sizeBytes: number;
		groupId?: string;
		fileName?: string;
	},
	{ useCases, identity }: ToolContext,
) {
	const ownerId = identity.userId;
	switch (input.purpose) {
		case "quizImage":
			return useCases.requestMediaUpload({ ownerId, ...input });
		case "themeImage":
			return useCases.requestThemeUpload({ ownerId, ...input });
		case "groupFile":
			return useCases.requestGroupUpload({
				userId: ownerId,
				groupId: input.groupId ?? "",
				type: input.contentType === "application/pdf" ? "pdf" : "image",
				contentType: input.contentType,
				sizeBytes: input.sizeBytes,
				fileName: input.fileName ?? "arquivo",
			});
	}
}

/** Uploading a file the agent has (spec 044, RN-24). */
export const fileTools = [
	defineTool({
		name: "request_upload",
		title: "Get an address to upload a file",
		description:
			"For agents that can run commands and have the file: returns an address to PUT the file to (with the headers given) and the uploadKey to use afterwards, valid for 5 minutes. Images are JPEG, PNG, GIF or WebP up to 10 MB; a group file may also be a PDF up to 20 MB. Without a shell, give a public link as { url } instead.",
		kind: "write",
		input: z
			.object({
				purpose: z
					.enum(["quizImage", "themeImage", "groupFile"])
					.describe(
						"quizImage (cover or question image), themeImage (custom theme logo or background) or groupFile (attachment of a group post).",
					),
				contentType: z
					.string()
					.max(10_000)
					.describe(
						"image/png, image/jpeg, image/gif, image/webp or application/pdf.",
					),
				sizeBytes: z.number().int().positive(),
				groupId: z.string().max(10_000).optional().describe("groupFile only."),
				fileName: z
					.string()
					.max(10_000)
					.optional()
					.describe("groupFile only: the name it downloads with."),
			})
			.refine((input) => input.purpose !== "groupFile" || input.groupId, {
				message: "A group file needs groupId.",
			}),
		run: async (input, context) => {
			const upload = await uploadFor(input, context);
			const headers = Object.entries(upload.headers)
				.map(([name, value]) => `-H '${name}: ${value}'`)
				.join(" ");
			return {
				uploadKey: upload.key,
				uploadUrl: upload.uploadUrl,
				method: upload.method,
				headers: upload.headers,
				expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
				curl: `curl -X PUT ${headers} --data-binary @<file> '${upload.uploadUrl}'`,
			};
		},
	}),
];
