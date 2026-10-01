import {
	MAX_MEDIA_BYTES,
	MEDIA_EXTENSIONS,
} from "@quizio/core/media/domain/media-policy";

export const ACCEPTED_IMAGE_TYPES = Object.keys(MEDIA_EXTENSIONS);

export const IMAGE_REJECTED_MESSAGE =
	"Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB.";
export const IMAGE_UPLOAD_FAILED_MESSAGE =
	"Não foi possível enviar a imagem. Tente de novo.";

/** Same media policy as the server (spec 007, RN-09), checked early to avoid a wasted upload. */
export function isAcceptedImage(file: Pick<File, "type" | "size">): boolean {
	return (
		ACCEPTED_IMAGE_TYPES.includes(file.type) &&
		file.size > 0 &&
		file.size <= MAX_MEDIA_BYTES
	);
}

/** One file at a time: the first accepted image of what was dropped or pasted (RN-10). */
export function pickImageFile(files: Iterable<File>): File | null {
	for (const file of files) {
		if (isAcceptedImage(file)) {
			return file;
		}
	}
	return null;
}
