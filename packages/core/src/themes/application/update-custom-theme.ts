import type { Clock } from "../../shared/application/ports/clock";
import type { ObjectStorage } from "../../shared/application/ports/object-storage";
import { themeLookFileKeys } from "../../shared/domain/theme-look";
import {
	type CustomTheme,
	parseThemeLookInput,
	parseThemeName,
	requireOwnedTheme,
	type ThemeLookInput,
} from "../domain/custom-theme";
import { ThemeUploadNotFoundError } from "../domain/theme-errors";
import { type CustomThemeView, toCustomThemeView } from "./custom-theme-view";
import type { CustomThemeRepository } from "./ports/custom-theme-repository";
import type { ThemeUploadRepository } from "./ports/theme-upload-repository";
import { newUploadsOf, releaseThemeFiles } from "./theme-files";

export type UpdateCustomTheme = (input: {
	ownerId: string;
	themeId: string;
	name: string;
	look: ThemeLookInput;
}) => Promise<CustomThemeView>;

/**
 * Salvar in "Editar tema" (spec 043, RN-17, RN-18): every quiz using the
 * theme reads the new look; games keep the one they copied. A file is the
 * theme's own or a pending upload it takes; the ones it lets go of are
 * released, for the sweep to delete unless a game copied them (RN-28).
 */
export function createUpdateCustomTheme(deps: {
	themes: CustomThemeRepository;
	themeUploads: Pick<ThemeUploadRepository, "addThemeUpload">;
	storage: Pick<ObjectStorage, "exists" | "getPublicUrl">;
	clock: Clock;
}): UpdateCustomTheme {
	return async ({ ownerId, themeId, name, look }) => {
		const before = requireOwnedTheme(
			await deps.themes.findById(themeId),
			ownerId,
		);
		const theme: CustomTheme = {
			...before,
			name: parseThemeName(name),
			look: parseThemeLookInput(look),
			updatedAt: deps.clock.now(),
		};
		const previousFiles = themeLookFileKeys(before.look);
		const uploads = await newUploadsOf(
			deps.storage,
			theme.look,
			ownerId,
			previousFiles,
		);
		if ((await deps.themes.updateTakingUploads(theme, uploads)) !== "ok") {
			throw new ThemeUploadNotFoundError();
		}

		const kept = new Set(themeLookFileKeys(theme.look));
		await releaseThemeFiles(
			deps,
			ownerId,
			previousFiles.filter((key) => !kept.has(key)),
		);
		const listed = await deps.themes.listByOwner(ownerId);
		const quizCount = listed.find((item) => item.id === theme.id)?.quizCount;
		return toCustomThemeView(theme, quizCount ?? 0, deps.storage);
	};
}
