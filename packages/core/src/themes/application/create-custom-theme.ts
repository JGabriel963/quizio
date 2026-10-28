import type { Clock } from "../../shared/application/ports/clock";
import type { IdGenerator } from "../../shared/application/ports/id-generator";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import {
	type CustomTheme,
	parseThemeLookInput,
	parseThemeName,
	type ThemeLookInput,
} from "../domain/custom-theme";
import { ThemeUploadNotFoundError } from "../domain/theme-errors";
import { type CustomThemeView, toCustomThemeView } from "./custom-theme-view";
import type { CustomThemeRepository } from "./ports/custom-theme-repository";
import { newUploadsOf } from "./theme-files";

export type CreateCustomTheme = (input: {
	ownerId: string;
	name: string;
	look: ThemeLookInput;
}) => Promise<CustomThemeView>;

/**
 * Salvar in "Crie seu tema" (spec 043, RN-13, RN-15): the name and the look
 * are checked before anything is written, and the theme takes its pending
 * uploads in one transaction, so a file becomes a theme's only once.
 */
export function createCreateCustomTheme(deps: {
	themes: CustomThemeRepository;
	storage: Pick<ObjectStorage, "exists" | "getPublicUrl">;
	ids: IdGenerator;
	clock: Clock;
}): CreateCustomTheme {
	return async ({ ownerId, name, look }) => {
		const now = deps.clock.now();
		const theme: CustomTheme = {
			id: deps.ids.generate(),
			ownerId,
			name: parseThemeName(name),
			look: parseThemeLookInput(look),
			createdAt: now,
			updatedAt: now,
		};
		const uploads = await newUploadsOf(deps.storage, theme.look, ownerId);
		if ((await deps.themes.createTakingUploads(theme, uploads)) !== "ok") {
			throw new ThemeUploadNotFoundError();
		}
		return toCustomThemeView(theme, 0, deps.storage);
	};
}
