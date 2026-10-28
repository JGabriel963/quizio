/**
 * Which theme files a game or an assignment copied (spec 043, RN-28): those
 * stay when the theme lets go of them.
 */
export interface ThemeFileUsage {
	inUse(keys: readonly string[]): Promise<Set<string>>;
}
