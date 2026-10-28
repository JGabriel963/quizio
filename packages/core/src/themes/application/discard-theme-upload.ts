import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { ThemeUploadRepository } from "./ports/theme-upload-repository";

export type DiscardThemeUpload = (input: {
	ownerId: string;
	key: string;
}) => Promise<void>;

/**
 * Cancelar, Remover and the X of "Crie seu tema" (spec 043, CA-10): one's own
 * pending upload goes, with its object; anything else is left alone.
 */
export function createDiscardThemeUpload(deps: {
	themeUploads: ThemeUploadRepository;
	storage: Pick<ObjectStorage, "delete">;
}): DiscardThemeUpload {
	return async ({ ownerId, key }) => {
		if (await deps.themeUploads.removeThemeUpload(key, ownerId)) {
			await deps.storage.delete(key);
		}
	};
}
