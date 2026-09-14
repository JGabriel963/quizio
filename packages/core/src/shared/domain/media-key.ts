const MEDIA_ROOT = "media";

/** Object key for a media file: every upload lives under its owner's prefix. */
export function mediaKeyFor(
	ownerId: string,
	id: string,
	extension: string,
): string {
	return `${MEDIA_ROOT}/${ownerId}/${id}.${extension}`;
}

/**
 * True only for a single file directly under the owner's prefix, so a client
 * cannot attach someone else's upload or escape the prefix with nested paths.
 */
export function isMediaKeyOwnedBy(key: string, ownerId: string): boolean {
	const prefix = `${MEDIA_ROOT}/${ownerId}/`;
	if (!key.startsWith(prefix)) {
		return false;
	}
	const fileName = key.slice(prefix.length);
	return (
		fileName.length > 0 &&
		!fileName.includes("/") &&
		fileName !== "." &&
		fileName !== ".."
	);
}

export function mediaKeyExtension(key: string): string | null {
	const fileName = key.slice(key.lastIndexOf("/") + 1);
	const dot = fileName.lastIndexOf(".");
	return dot > 0 ? fileName.slice(dot + 1) : null;
}
