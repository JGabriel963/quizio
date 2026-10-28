import type { ThemeLook } from "../../../shared/domain/theme-look";

/**
 * The quiz's view of the custom themes (spec 043, ADR 0022): whether one is
 * the owner's to apply, and its look for the editor's canvas.
 */
export interface CustomThemeReads {
	findOwned(
		ownerId: string,
		id: string,
	): Promise<{ id: string; look: ThemeLook } | null>;
}
