import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	type ThemeLookView,
	themeLookView,
} from "../../shared/application/theme-look-view";
import type { ThemeLook } from "../../shared/domain/theme-look";
import type { CustomTheme } from "../domain/custom-theme";

/**
 * A theme of "Seus temas" (spec 043, RN-16): the look as stored, so Editar
 * can send back the files it keeps, and as drawn, with the URLs.
 */
export interface CustomThemeView {
	id: string;
	name: string;
	look: ThemeLook;
	view: ThemeLookView;
	quizCount: number;
}

export function toCustomThemeView(
	theme: CustomTheme,
	quizCount: number,
	storage: Pick<ObjectStorage, "getPublicUrl">,
): CustomThemeView {
	return {
		id: theme.id,
		name: theme.name,
		look: theme.look,
		// A theme's own look is never null.
		view: themeLookView(theme.look, storage, {
			withLogo: true,
		}) as ThemeLookView,
		quizCount,
	};
}
