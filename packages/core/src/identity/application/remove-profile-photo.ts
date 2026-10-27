import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { ProfilePhotoRepository } from "./ports/profile-photo-repository";
import type { ProfilePhotoResult } from "./set-profile-photo";

export type RemoveProfilePhoto = (input: {
	userId: string;
}) => Promise<ProfilePhotoResult>;

/** Back to the default icon, and the file goes (spec 039, RN-11). */
export function createRemoveProfilePhoto(deps: {
	storage: ObjectStorage;
	profilePhotos: ProfilePhotoRepository;
}): RemoveProfilePhoto {
	return async ({ userId }) => {
		const previous = await deps.profilePhotos.remove(userId);
		if (previous) {
			await deps.storage.delete(previous);
		}
		return { photoUrl: null };
	};
}
