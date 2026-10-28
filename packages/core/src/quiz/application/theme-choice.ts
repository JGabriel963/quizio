import {
	DEFAULT_THEME_ID,
	type ThemeId,
	ThemeNotFoundError,
} from "../../shared/domain/theme";
import { parseThemeId, type QuizThemeChoice } from "../domain/quiz";
import type { CustomThemeReads } from "./ports/custom-theme-reads";

/**
 * What a theme choice stores on the quiz: a ready-made id from the catalog, or
 * one of the owner's custom themes with the ready-made id at standard, which
 * is what is left when that theme is deleted (spec 042, RN-05; spec 043,
 * RN-19, RN-21).
 */
export async function resolveThemeChoice(
	customThemes: CustomThemeReads,
	ownerId: string,
	choice: QuizThemeChoice,
): Promise<{ themeId: ThemeId; customThemeId: string | null }> {
	if (choice.kind === "catalog") {
		return { themeId: parseThemeId(choice.themeId), customThemeId: null };
	}
	const theme = await customThemes.findOwned(ownerId, choice.customThemeId);
	if (!theme) {
		throw new ThemeNotFoundError();
	}
	return { themeId: DEFAULT_THEME_ID, customThemeId: theme.id };
}
