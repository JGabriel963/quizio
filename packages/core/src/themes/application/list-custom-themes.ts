import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { type CustomThemeView, toCustomThemeView } from "./custom-theme-view";
import type { CustomThemeRepository } from "./ports/custom-theme-repository";

export type ListCustomThemes = (input: {
	ownerId: string;
}) => Promise<CustomThemeView[]>;

/** "Seus temas" (spec 043, RN-16): only the owner's, newest first. */
export function createListCustomThemes(deps: {
	themes: Pick<CustomThemeRepository, "listByOwner">;
	storage: Pick<ObjectStorage, "getPublicUrl">;
}): ListCustomThemes {
	return async ({ ownerId }) =>
		(await deps.themes.listByOwner(ownerId)).map((theme) =>
			toCustomThemeView(theme, theme.quizCount, deps.storage),
		);
}
