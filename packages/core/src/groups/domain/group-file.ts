import { truncateCharacters } from "../../shared/domain/text-length";
import {
	InvalidGroupFileSizeError,
	UnsupportedGroupFileError,
} from "./group-errors";

/** An image or a PDF posted in a group (spec 036, RN-09, RN-11). */
export const GROUP_FILE_TYPES = ["image", "pdf"] as const;
export type GroupFileType = (typeof GROUP_FILE_TYPES)[number];

/** The file a post carries; the key is under the group (ADR 0017). */
export interface GroupPostFile {
	type: GroupFileType;
	key: string;
	name: string;
	sizeBytes: number;
}

/** The same images as the questions' (spec 007); a test ties the two. */
export const GROUP_IMAGE_EXTENSIONS = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/gif": "gif",
	"image/webp": "webp",
} as const;
export const GROUP_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
/** The creation assistant's limit (spec 027). */
export const GROUP_PDF_MAX_BYTES = 20 * 1024 * 1024;
const PDF_CONTENT_TYPE = "application/pdf";

const FILE_NAME_MAX_LENGTH = 120;
const DEFAULT_NAMES: Record<GroupFileType, string> = {
	image: "imagem",
	pdf: "arquivo.pdf",
};

export interface ParsedGroupFile {
	type: GroupFileType;
	contentType: string;
	extension: string;
	sizeBytes: number;
	name: string;
}

/**
 * Checks what the browser says it will send: the type matches the attach
 * button, the size is within its limit, and the name is only a name.
 */
export function parseGroupFile(input: {
	type: GroupFileType;
	contentType: string;
	sizeBytes: number;
	fileName: string;
}): ParsedGroupFile {
	const extension = extensionOf(input.type, input.contentType);
	const maxBytes =
		input.type === "image" ? GROUP_IMAGE_MAX_BYTES : GROUP_PDF_MAX_BYTES;
	if (
		!Number.isInteger(input.sizeBytes) ||
		input.sizeBytes <= 0 ||
		input.sizeBytes > maxBytes
	) {
		throw new InvalidGroupFileSizeError();
	}
	return {
		type: input.type,
		contentType: input.contentType,
		extension,
		sizeBytes: input.sizeBytes,
		name: cleanFileName(input.fileName) || DEFAULT_NAMES[input.type],
	};
}

function extensionOf(type: GroupFileType, contentType: string): string {
	if (type === "pdf" && contentType === PDF_CONTENT_TYPE) {
		return "pdf";
	}
	if (type === "image" && Object.hasOwn(GROUP_IMAGE_EXTENSIONS, contentType)) {
		return GROUP_IMAGE_EXTENSIONS[
			contentType as keyof typeof GROUP_IMAGE_EXTENSIONS
		];
	}
	throw new UnsupportedGroupFileError();
}

/** The last part of a path, without control characters, cut at 120. */
function cleanFileName(raw: string): string {
	const base = raw.split(/[/\\]/).pop() ?? "";
	// biome-ignore lint/suspicious/noControlCharactersInRegex: removing them is the point
	const name = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
	return truncateCharacters(name, FILE_NAME_MAX_LENGTH);
}
