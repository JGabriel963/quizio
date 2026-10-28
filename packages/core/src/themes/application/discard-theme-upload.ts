import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import type { ThemeFileUsage } from "./ports/theme-file-usage";
import type { ThemeUploadRepository } from "./ports/theme-upload-repository";
import { deleteUncopiedFiles } from "./theme-files";

export type DiscardThemeUpload = (input: {
	ownerId: string;
	key: string;
}) => Promise<void>;

/**
 * Cancelar, Remover and the X of "Crie seu tema" (spec 043, CA-10): one's own
 * pending upload goes, with its object unless a game copied it (a file a
 * theme let go of is pending again); anything else is left alone.
 */
export function createDiscardThemeUpload(deps: {
	themeUploads: ThemeUploadRepository;
	fileUsage: ThemeFileUsage;
	storage: Pick<ObjectStorage, "delete">;
}): DiscardThemeUpload {
	return async ({ ownerId, key }) => {
		if (await deps.themeUploads.removeThemeUpload(key, ownerId)) {
			await deleteUncopiedFiles(deps, [key]);
		}
	};
}
