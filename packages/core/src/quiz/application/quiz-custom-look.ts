import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	type ThemeLookView,
	themeLookView,
} from "../../shared/application/theme-look-view";
import type { Quiz } from "../domain/quiz";
import type { CustomThemeReads } from "./ports/custom-theme-reads";

/**
 * The look of the quiz's custom theme, for the owner's screens: the editor's
 * canvas and the opening of a game (spec 043, RN-22). Null with a ready-made
 * theme, or when the theme went meanwhile.
 */
export async function quizCustomLook(
	deps: {
		customThemes: CustomThemeReads;
		storage: Pick<ObjectStorage, "getPublicUrl">;
	},
	quiz: Quiz,
): Promise<ThemeLookView | null> {
	if (!quiz.customThemeId) {
		return null;
	}
	const theme = await deps.customThemes.findOwned(
		quiz.ownerId,
		quiz.customThemeId,
	);
	return themeLookView(theme?.look ?? null, deps.storage, { withLogo: true });
}
