import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { CreatorProfileNotFoundError } from "../domain/account-errors";
import type { AccountCredentials } from "./ports/account-credentials";
import type { AccountRepository } from "./ports/account-repository";
import type { ProfilePhotoRepository } from "./ports/profile-photo-repository";

/** What the account menu and the settings show (spec 039, RN-02). */
export interface AccountView {
	userId: string;
	name: string;
	email: string;
	/** Only the photo uploaded in Quizio; Google's is never used (RN-05). */
	photoUrl: string | null;
	/** False for an account that only signs in with Google (RN-24). */
	hasPassword: boolean;
}

export type GetAccount = (input: { userId: string }) => Promise<AccountView>;

export function createGetAccount(deps: {
	accounts: AccountRepository;
	credentials: AccountCredentials;
	profilePhotos: ProfilePhotoRepository;
	storage: ObjectStorage;
}): GetAccount {
	return async ({ userId }) => {
		const account = await deps.accounts.find(userId);
		if (!account) {
			throw new CreatorProfileNotFoundError(`No account ${userId}`);
		}
		const [photoKey, hasPassword] = await Promise.all([
			deps.profilePhotos.keyOf(userId),
			deps.credentials.hasPassword(userId),
		]);
		return {
			userId: account.id,
			name: account.name,
			email: account.email,
			photoUrl: photoKey ? deps.storage.getPublicUrl(photoKey) : null,
			hasPassword,
		};
	};
}
