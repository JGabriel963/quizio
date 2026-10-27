import type { ObjectStorage } from "./ports/object-storage";
import type { ProfilePhotoKeys } from "./ports/profile-photo-keys";

/**
 * A person as the screens show them: the name and the profile photo (spec
 * 039, RN-06). The URL is built on the server; screens never build one.
 */
export interface PersonView {
	userId: string;
	name: string;
	photoUrl: string | null;
}

export function personView(
	person: { userId: string; name: string; photoKey: string | null },
	storage: Pick<ObjectStorage, "getPublicUrl">,
): PersonView {
	return {
		userId: person.userId,
		name: person.name,
		photoUrl: person.photoKey ? storage.getPublicUrl(person.photoKey) : null,
	};
}

/** A user's photo URL, or null for the default icon. */
export type PhotoUrlOf = (userId: string) => string | null;

/** Reads the photos of everybody a screen shows, in one go. */
export async function loadPhotoUrls(
	userIds: Iterable<string>,
	deps: {
		profilePhotos: ProfilePhotoKeys;
		storage: Pick<ObjectStorage, "getPublicUrl">;
	},
): Promise<PhotoUrlOf> {
	const keys = await deps.profilePhotos.keysOf([...new Set(userIds)]);
	return (userId) => {
		const key = keys.get(userId);
		return key ? deps.storage.getPublicUrl(key) : null;
	};
}
