import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { isProfilePhotoKeyOwnedBy } from "../../shared/domain/media-key";
import { InvalidProfilePhotoError } from "../domain/account-errors";
import type { ProfilePhotoRepository } from "./ports/profile-photo-repository";

export interface ProfilePhotoResult {
	photoUrl: string | null;
}

export type SetProfilePhoto = (input: {
	userId: string;
	key: string;
}) => Promise<ProfilePhotoResult>;

/**
 * Keeps the uploaded photo and deletes the one it replaces (spec 039, RN-10,
 * RN-11). Only the user's own upload that reached storage is accepted.
 */
export function createSetProfilePhoto(deps: {
	storage: ObjectStorage;
	profilePhotos: ProfilePhotoRepository;
}): SetProfilePhoto {
	return async ({ userId, key }) => {
		if (
			!isProfilePhotoKeyOwnedBy(key, userId) ||
			!(await deps.storage.exists(key))
		) {
			throw new InvalidProfilePhotoError(`Not an uploaded photo: ${key}`);
		}
		const previous = await deps.profilePhotos.save(userId, key);
		if (previous && previous !== key) {
			await deps.storage.delete(previous);
		}
		return { photoUrl: deps.storage.getPublicUrl(key) };
	};
}
