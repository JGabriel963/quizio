import type { Clock } from "../../shared/application/ports/clock";
import { themeLookFileKeys } from "../../shared/domain/theme-look";
import { requireOwnedTheme } from "../domain/custom-theme";
import type { CustomThemeRepository } from "./ports/custom-theme-repository";
import type { ThemeUploadRepository } from "./ports/theme-upload-repository";
import { releaseThemeFiles } from "./theme-files";

export type DeleteCustomTheme = (input: {
	ownerId: string;
	themeId: string;
}) => Promise<void>;

/**
 * Excluir in "Seus temas" (spec 043, RN-19): the quizzes using it go back to
 * standard through the foreign key; games keep the look they copied, so its
 * files are released, for the sweep to delete unless a game copied them
 * (RN-28).
 */
export function createDeleteCustomTheme(deps: {
	themes: CustomThemeRepository;
	themeUploads: Pick<ThemeUploadRepository, "addThemeUpload">;
	clock: Clock;
}): DeleteCustomTheme {
	return async ({ ownerId, themeId }) => {
		const theme = requireOwnedTheme(
			await deps.themes.findById(themeId),
			ownerId,
		);
		await deps.themes.delete(theme.id);
		await releaseThemeFiles(deps, ownerId, themeLookFileKeys(theme.look));
	};
}
