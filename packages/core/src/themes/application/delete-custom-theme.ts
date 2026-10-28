import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { themeLookFileKeys } from "../../shared/domain/theme-look";
import { requireOwnedTheme } from "../domain/custom-theme";
import type { CustomThemeRepository } from "./ports/custom-theme-repository";
import type { ThemeFileUsage } from "./ports/theme-file-usage";
import { releaseUnusedThemeFiles } from "./theme-files";

export type DeleteCustomTheme = (input: {
	ownerId: string;
	themeId: string;
}) => Promise<void>;

/**
 * Excluir in "Seus temas" (spec 043, RN-19): the quizzes using it go back to
 * standard through the foreign key; games keep the look they copied, so its
 * files go only when no game copied them (RN-28).
 */
export function createDeleteCustomTheme(deps: {
	themes: CustomThemeRepository;
	fileUsage: ThemeFileUsage;
	storage: Pick<ObjectStorage, "delete">;
}): DeleteCustomTheme {
	return async ({ ownerId, themeId }) => {
		const theme = requireOwnedTheme(
			await deps.themes.findById(themeId),
			ownerId,
		);
		await deps.themes.delete(theme.id);
		await releaseUnusedThemeFiles(deps, themeLookFileKeys(theme.look));
	};
}
