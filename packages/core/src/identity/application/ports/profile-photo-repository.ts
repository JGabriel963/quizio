import type { ProfilePhotoKeys } from "../../../shared/application/ports/profile-photo-keys";

/** One photo key per user (spec 039; ADR 0019); never `user.image`. */
export interface ProfilePhotoRepository extends ProfilePhotoKeys {
	keyOf(userId: string): Promise<string | null>;
	/** Returns the key it replaced, for deleting that file (RN-11). */
	save(userId: string, key: string): Promise<string | null>;
	/** Returns the key it removed. */
	remove(userId: string): Promise<string | null>;
}
