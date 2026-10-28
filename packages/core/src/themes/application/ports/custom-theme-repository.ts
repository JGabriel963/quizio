import type { CustomTheme } from "../../domain/custom-theme";

export type CustomThemeWithUsage = CustomTheme & {
	/** The owner's quizzes using it, trash included (spec 043, RN-19). */
	quizCount: number;
};

/**
 * The custom themes (spec 043, ADR 0022). Writing a theme takes its pending
 * uploads in the same transaction, so a file becomes a theme's once.
 */
export interface CustomThemeRepository {
	findById(id: string): Promise<CustomTheme | null>;
	/** The owner's, newest first (RN-16). */
	listByOwner(ownerId: string): Promise<CustomThemeWithUsage[]>;
	/**
	 * Inserts the theme and removes the owner's pending uploads with these
	 * keys; writes nothing when one of them is not pending.
	 */
	createTakingUploads(
		theme: CustomTheme,
		uploadKeys: readonly string[],
	): Promise<"ok" | "uploadMissing">;
	/** Like `createTakingUploads`, rewriting the name and the look. */
	updateTakingUploads(
		theme: CustomTheme,
		uploadKeys: readonly string[],
	): Promise<"ok" | "uploadMissing">;
	/** The quizzes using it go back to standard by the foreign key (RN-19). */
	delete(id: string): Promise<void>;
}
