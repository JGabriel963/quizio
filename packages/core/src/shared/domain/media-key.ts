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
	return isFileDirectlyUnder(key, `${MEDIA_ROOT}/${ownerId}/`);
}

/**
 * A PDF sent to the creation assistant (spec 027): temporary, so it lives
 * apart from the media, which images use and keep.
 */
const SOURCES_ROOT = "sources";

export function sourceKeyFor(ownerId: string, id: string): string {
	return `${SOURCES_ROOT}/${ownerId}/${id}.pdf`;
}

export function isSourceKeyOwnedBy(key: string, ownerId: string): boolean {
	return isFileDirectlyUnder(key, `${SOURCES_ROOT}/${ownerId}/`);
}

/** A file posted in a group (spec 036, ADR 0017): it belongs to the group. */
const GROUPS_ROOT = "groups";

export function groupFileKeyFor(
	groupId: string,
	id: string,
	extension: string,
): string {
	return `${GROUPS_ROOT}/${groupId}/${id}.${extension}`;
}

export function isGroupFileKeyOf(key: string, groupId: string): boolean {
	return isFileDirectlyUnder(key, `${GROUPS_ROOT}/${groupId}/`);
}

/** A creator's profile photo (spec 039, ADR 0019): cropped in the browser. */
const PROFILES_ROOT = "profiles";

export function profilePhotoKeyFor(
	userId: string,
	id: string,
	extension: string,
): string {
	return `${PROFILES_ROOT}/${userId}/${id}.${extension}`;
}

export function isProfilePhotoKeyOwnedBy(key: string, userId: string): boolean {
	return isFileDirectlyUnder(key, profilePhotoPrefixOf(userId));
}

/**
 * A custom theme's background image or logo (spec 043, ADR 0022): kept
 * apart from the media because games copy them and keep them.
 */
const THEMES_ROOT = "themes";

export function themeFileKeyFor(
	ownerId: string,
	id: string,
	extension: string,
): string {
	return `${THEMES_ROOT}/${ownerId}/${id}.${extension}`;
}

export function isThemeFileKeyOwnedBy(key: string, ownerId: string): boolean {
	return isFileDirectlyUnder(key, themesPrefixOf(ownerId));
}

export function themesPrefixOf(ownerId: string): string {
	return `${THEMES_ROOT}/${ownerId}/`;
}

/** Everything a user keeps in storage, by prefix, for deleting the account. */
export function profilePhotoPrefixOf(userId: string): string {
	return `${PROFILES_ROOT}/${userId}/`;
}

export function mediaPrefixOf(ownerId: string): string {
	return `${MEDIA_ROOT}/${ownerId}/`;
}

export function sourcesPrefixOf(ownerId: string): string {
	return `${SOURCES_ROOT}/${ownerId}/`;
}

function isFileDirectlyUnder(key: string, prefix: string): boolean {
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
